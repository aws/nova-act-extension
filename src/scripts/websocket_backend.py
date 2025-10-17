import ast
import ctypes
import io
import json
import os
import sys
import threading
import traceback
from contextlib import redirect_stderr, redirect_stdout
from enum import Enum
from queue import Empty, Queue

from websockets.sync.server import ServerConnection, serve


class CompletionStatus(Enum):
    """Cell execution completion status, matching CellCompletionStatus in TS."""

    COMPLETED = "completed"
    FAILED = "failed"
    ABORTED = "aborted"

class NovaActStatus(Enum):
    """NovaAct status, matching NovaActStatus in TS."""

    STARTED = "started"
    STOPPED = "stopped"

worker_thread = None
worker_queue = Queue()
cell_id = None
globals_dict = {}
last_nova_act_instance = None

def _async_raise(tid, exctype):
    """Raise an exception in a thread"""
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(
        ctypes.c_long(tid), ctypes.py_object(exctype)
    )
    if res == 0:
        raise ValueError("Invalid thread id")
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(tid), None)
        raise SystemError("PyThreadState_SetAsyncExc failed")


def stop_worker():
    """Stop the worker thread if it's running."""
    global worker_thread
    if worker_thread and worker_thread.is_alive():
        _async_raise(worker_thread.ident, KeyboardInterrupt)


class CapturingStream(io.TextIOBase):
    """Stream that captures output and sends it via a callback."""

    def __init__(self, original_stream, send_callback):
        self.original_stream = original_stream
        self.send_callback = send_callback

    def write(self, s):
        if s:
            self.send_callback(
                {
                    "type": (
                        "stdout" if self.original_stream is sys.__stdout__ else "stderr"
                    ),
                    "data": s,
                    "cellId": cell_id,
                    "success": True,
                }
            )
            self.original_stream.write(s)
            self.original_stream.flush()
        return len(s)

    def flush(self):
        self.original_stream.flush()


def worker_loop():
    """Worker thread that executes code from the queue."""
    global globals_dict, last_nova_act_instance
    while True:
        try:
            code, send_json = worker_queue.get(timeout=0.1)
        except Empty:
            continue

        # Initialize completion status, to be updated based on exceptions if any
        completion_status = CompletionStatus.COMPLETED
        success = True  # We assume success unless an exception occurs, since we default to stderr for NovaAct prints

        try:
            # Check if a NovaAct instance is already running
            var_name = find_last_novaact_var(code)
            if var_name:
                if last_nova_act_instance is not None:
                    try:
                        if last_nova_act_instance.started:
                            success = False
                            send_json(
                                {
                                    "type": "stderr",
                                    "data": f"Another NovaAct instance is already running. Please stop it before starting a new one, or click the 'Restart Notebook' button in the top-right corner of Builder Mode.\n",
                                    "cellId": cell_id,
                                    "success": success,
                                }
                            )
                            completion_status = CompletionStatus.FAILED
                            send_json(
                                {
                                    "type": "cell_end",
                                    "cellId": cell_id,
                                    "success": success,
                                    "completionStatus": completion_status.value,
                                }
                            )
                            continue
                    except Exception as err:
                        success = False
                        send_json(
                            {
                                "type": "stderr",
                                "data": f"Could not verify last NovaAct instance status, rejecting new instance. ${err}\n",
                                "cellId": cell_id,
                                "success": success,
                            }
                        )
                        completion_status = CompletionStatus.FAILED
                        send_json(
                            {
                                "type": "cell_end",
                                "cellId": cell_id,
                                "success": success,
                                "completionStatus": completion_status.value,
                            }
                        )
                        continue
            with redirect_stdout(
                CapturingStream(sys.__stdout__, send_json)
            ), redirect_stderr(CapturingStream(sys.__stderr__, send_json)):
                exec(code, globals_dict)
            if var_name and var_name in globals_dict:
              last_nova_act_instance = globals_dict[var_name]
        except KeyboardInterrupt:
            success = False
            send_json(
                {
                    "type": "stderr",
                    "data": "Cell execution cancelled (KeyboardInterrupt)\n",
                    "cellId": cell_id,
                    "success": success,
                }
            )
            completion_status = CompletionStatus.ABORTED
        except Exception as err:
            success = False
            error_msg = f"{err.__class__.__name__}: {err}"
            send_json(
                {
                    "type": "stderr",
                    "data": error_msg + "\n",
                    "cellId": cell_id,
                    "success": success,
                }
            )
            completion_status = CompletionStatus.FAILED
        finally:
            send_json(
                {
                    "type": "cell_end",
                    "cellId": cell_id,
                    "success": success,
                    "completionStatus": completion_status.value,
                    "novaActStatus": NovaActStatus.STARTED.value if last_nova_act_instance and getattr(last_nova_act_instance, 'started', False) else NovaActStatus.STOPPED.value
                }
            )


def handler(ws: ServerConnection):
    """WebSocket handler for receiving and processing code execution requests."""
    global cell_id, worker_thread

    code_lines = []
    collecting = False

    def send_json(data):
        ws.send(json.dumps(data))

    if not worker_thread:
        worker_thread = threading.Thread(target=worker_loop, daemon=True)
        worker_thread.start()

    for message in ws:
        try:
            data = json.loads(message)
            cmd = data.get("cmd")
            line = data.get("line", "")

            if cmd == "CELL_ID":
                cell_id = str(data.get("cellId", ""))
                continue

            if cmd == "CELL_CODE_START":
                code_lines.clear()
                collecting = True
                continue

            if cmd == "CELL_CODE_LINE" and collecting:
                code_lines.append(line)
                continue

            if cmd == "CELL_CODE_END" and collecting:
                collecting = False
                code = "\n".join(code_lines)
                worker_queue.put((code, send_json))
                continue

            if cmd == "STOP_EXECUTION":
                stop_worker()
                continue
            
            if cmd == "UPDATE_API_KEY":
                # Dynamically update the environment variable
                new_api_key = str(data.get("data", ""))
                os.environ["NOVA_ACT_API_KEY"] = new_api_key
                continue                

        except Exception as e:
            send_json(
                {
                    "type": "stderr",
                    "data": str(e),
                    "traceback": traceback.format_exc(),
                    "cellId": cell_id,
                    "success": False,
                }
            )


def find_last_novaact_var(code: str):
    """Return the last variable name assigned to NovaAct(...), if any."""
    tree = ast.parse(code)
    last_var = None

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            if isinstance(node.value, ast.Call) and getattr(node.value.func, "id", None) == "NovaAct":
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        last_var = target.id
        elif isinstance(node, ast.AnnAssign):
            if isinstance(node.value, ast.Call) and getattr(node.value.func, "id", None) == "NovaAct":
                if isinstance(node.target, ast.Name):
                    last_var = node.target.id
    return last_var

if __name__ == "__main__":    
    # Get port from environment variable, default to 8765
    port = int(os.environ.get('NOVA_ACT_WEBSOCKET_PORT', '8765'))
    
    print(f"Starting Nova Act WebSocket server on port {port}")
    with serve(handler, "", port) as server:
        server.serve_forever()
