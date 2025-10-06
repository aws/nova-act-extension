import { EVENTS, type TelemetryEvent } from '../telemetry/events';
import { builderModeVscodeApi } from './vscodeApi';

export const fetchChromeDevToolsUrl = () => {
  if (builderModeVscodeApi) {
    builderModeVscodeApi.postMessage({
      command: 'fetchChromeDevToolsUrl',
      url: 'http://localhost:9222/json',
    });
  }
};

export const createRunId = () => {
  return crypto.randomUUID();
};

export const countLines = (code: string) => {
  return code.split('\n').length;
};

/**
 * Helper function to count the number of `.act()` calls in a given code string.
 * @param code
 * @returns number of `.act()` calls
 */
export const countActCalls = (code: string): number => {
  // Filter out commented lines to avoid counting .act() calls within comments
  return (
    code
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n')
      .match(/\.act\(/g)?.length ?? 0
  );
};

/* ----------------------------- Telemetry Utils ---------------------------- */

export const sendTelemetry = (event: TelemetryEvent) => {
  if (builderModeVscodeApi) {
    builderModeVscodeApi.postMessage({
      command: 'sendTelemetry',
      ...event,
    });
  }
};

export const captureScriptLoadedTemplate = ({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) => {
  sendTelemetry({
    eventName: EVENTS.SCRIPT.LOADED_TEMPLATE,
    properties: { template_id: templateId, template_name: templateName },
  });
};

export const captureCellsAdded = ({ count }: { count: number }) => {
  if (count === 0) return;
  sendTelemetry({
    eventName: EVENTS.EDITOR.CELLS_ADDED,
    properties: { count },
  });
};

export const captureCellsDeleted = ({ count }: { count: number }) => {
  if (count === 0) return;

  sendTelemetry({
    eventName: EVENTS.EDITOR.CELLS_DELETED,
    properties: { count },
  });
};

export const captureRunCellStarted = ({
  runId,
  cellId,
  lineCount,
  actCallCount,
}: {
  runId: string;
  cellId: string;
  lineCount: number;
  actCallCount: number;
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_CELL_STARTED,
    properties: {
      run_id: runId,
      cell_id: cellId,
      line_count: lineCount,
      act_call_count: actCallCount,
    },
  });
};

export const captureRunAllCellsStarted = ({
  runId,
  cellCount,
  lineCount,
  actCallCount,
  cellIds,
}: {
  runId: string;
  cellCount: number;
  lineCount: number;
  actCallCount: number;
  cellIds: string[];
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_ALL_STARTED,
    properties: {
      run_id: runId,
      cell_count: cellCount,
      line_count: lineCount,
      act_call_count: actCallCount,
      cell_ids: cellIds,
    },
  });
};

export const captureRunCellCompleted = ({
  runId,
  cellId,
  durationMs,
  actCallCount,
  lineCount,
}: {
  runId: string;
  cellId: string;
  durationMs: number;
  actCallCount: number;
  lineCount: number;
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_CELL_COMPLETED,
    properties: {
      run_id: runId,
      cell_id: cellId,
      duration_ms: durationMs,
      act_call_count: actCallCount,
      line_count: lineCount,
    },
  });
};

export const captureRunCellFailed = ({
  runId,
  cellId,
  actCallCount,
  lineCount,
  durationMs,
  errorMessage,
}: {
  runId: string;
  cellId: string;
  actCallCount: number;
  lineCount: number;
  durationMs: number;
  errorMessage?: string;
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_CELL_FAILED,
    properties: {
      run_id: runId,
      cell_id: cellId,
      act_call_count: actCallCount,
      line_count: lineCount,
      duration_ms: durationMs,
      error_message: errorMessage,
    },
  });
};

export const captureRunCellAborted = ({
  runId,
  cellId,
  actCallCount,
  lineCount,
  durationMs,
}: {
  runId: string;
  cellId: string;
  actCallCount: number;
  lineCount: number;
  durationMs: number;
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_CELL_ABORTED,
    properties: {
      run_id: runId,
      cell_id: cellId,
      duration_ms: durationMs,
      act_call_count: actCallCount,
      line_count: lineCount,
    },
  });
};

export const captureRunAllCellsCompleted = ({
  runId,
  durationMs,
  cellCount,
  actCallCount,
  lineCount,
  succeeded,
  failed,
  aborted,
  cellIds,
}: {
  runId: string;
  durationMs: number;
  cellCount: number;
  actCallCount: number;
  lineCount: number;
  succeeded: number;
  failed: number;
  aborted: number;
  cellIds: string[];
}) => {
  sendTelemetry({
    eventName: EVENTS.EDITOR.RUN_ALL_COMPLETED,
    properties: {
      run_id: runId,
      duration_ms: durationMs,
      cell_count: cellCount,
      act_call_count: actCallCount,
      line_count: lineCount,
      succeeded,
      failed,
      aborted,
      cell_ids: cellIds,
    },
  });
};

/* ----------------------------- Util to get stored preference ---------------------------- */
export const getPreference = (key: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!builderModeVscodeApi) {
      resolve(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'getPreferenceValue' && msg.key === key) {
        window.removeEventListener('message', handleMessage);
        resolve(msg.value);
      }
    };

    window.addEventListener('message', handleMessage);
    builderModeVscodeApi.postMessage({ command: 'getPreference', key });
  });
};
