/**
 * Sample Python code for testing the splitPythonCode function.
 * This maintains the same structure as the original test file but as a TypeScript constant.
 */
export const SAMPLE_PYTHON_CODE = `"""Example of using DataProcessor with tool integration to process information.

Usage:
python processor.py [--debug_mode]
"""

import argparse
import random
from datetime import datetime, timedelta
from typing import Literal, Optional
from dataclasses import dataclass
from collections import defaultdict
import os

os.environ["PROCESSOR_CONFIG"] = "--enable-logging=true"

class ActionRequest(dataclass):
    action: str
    parameters: Optional[str] = None


class ProcessResult(dataclass):
    status: Literal["completed"]
    message: str
    data_summary: Optional[dict] = None


def get_schema_config():
    return {
        "type": "object",
        "oneOf": [
            {"type": "object", "properties": {"action": {"type": "string"}}},
            {"type": "object", "properties": {"status": {"type": "string"}}}
        ]
    }


def get_source_location() -> str:
    """Returns a random source location for data processing.
    Use this tool to determine where data should be sourced from."""
    locations = ["Database A", "File System B", "API Endpoint C", "Cache D", "Stream E"]
    return random.choice(locations)


def get_target_location() -> str:
    """Returns a random target location for data output.
    Use this tool to determine where processed data should be stored."""
    targets = ["Output DB", "File Store", "Message Queue", "Analytics DB", "Archive"]
    return random.choice(targets)


def get_process_date() -> str:
    """Returns a random processing date within the next 30 days.
    Use this tool to determine when processing should occur."""
    future_date = datetime.now() + timedelta(days=random.randint(1, 30))
    return future_date.strftime("%Y-%m-%d")


def get_batch_date() -> str:
    """Returns a random batch date 1-7 days after processing.
    Use this tool to determine the batch processing date."""
    process_days = random.randint(1, 30)
    batch_days = process_days + random.randint(1, 7)
    future_date = datetime.now() + timedelta(days=batch_days)
    return future_date.strftime("%Y-%m-%d")


def get_record_count() -> int:
    """Returns a random number of records between 100 and 10000.
    Use this tool to determine how many records to process."""
    return random.randint(100, 10000)


def get_priority_level() -> str:
    """Returns a random priority level for processing.
    Use this tool to determine the processing priority."""
    levels = ["Low", "Normal", "High", "Critical"]
    return random.choice(levels)


def main(debug_mode: bool = False) -> None:
    processors = {
        "get_source_location": get_source_location,
        "get_target_location": get_target_location,
        "get_process_date": get_process_date,
        "get_batch_date": get_batch_date,
        "get_record_count": get_record_count,
        "get_priority_level": get_priority_level,
    }

    config = {
        "base_url": "https://api.example.com/process",
        "api_key": "demo-key-12345",
        "timeout": 30,
        "debug": debug_mode,
    }
    
    session_data = defaultdict(dict)
    attempts = 0
    processor_responses = {}
    
    try:
        while attempts < 10:
            instruction = f"""
You are an automated data processing coordinator. Your task is to gather processing parameters and execute data operations.

CURRENT STATE: {processor_responses if processor_responses else "No processing parameters collected yet"}

AVAILABLE PARAMETER TOOLS:
- get_source_location: Gets data source information
- get_target_location: Gets output destination data  
- get_process_date: Gets processing schedule date
- get_batch_date: Gets batch processing date
- get_record_count: Gets record count parameters
- get_priority_level: Gets processing priority level

WORKFLOW:
1. If you need parameters, respond with: {{"action": "tool_name", "parameters": "brief description"}}
2. Once you have all parameters, execute the processing operation
3. When complete, respond with: {{"status": "completed", "message": "processing done", "data_summary": {{collected_params}}}}
4. DO NOT call these functions directly - they are handled by the framework
5. The system will execute the tool and provide you with the result

RESPONSE FORMAT:
- To collect: {{"action": "get_source_location", "parameters": "need source info"}}
- To finish: {{"status": "completed", "message": "Data processing completed", "data_summary": {{"source": "DB", "target": "Store", "date": "2024-02-15", "batch": "2024-02-20", "records": 5000, "priority": "High"}}}}

What action should be taken next? Respond with the exact JSON format shown above.
"""
            
            # Simulate processing logic
            if len(processor_responses) < 6:
                # Still collecting parameters
                missing_tools = [tool for tool in processors.keys() if tool not in processor_responses]
                if missing_tools:
                    next_tool = missing_tools[0]
                    tool_func = processors.get(next_tool)
                    if tool_func:
                        response = tool_func()
                        print(f"🔧 {next_tool} -> {response}")
                        processor_responses[next_tool] = response
            else:
                # All parameters collected
                print("\\n📊 Data Processing Completed!")
                print("✅ All parameters collected successfully")
                if processor_responses:
                    print("\\n📋 Processing Summary:")
                    for key, value in processor_responses.items():
                        clean_key = key.replace('get_', '').replace('_', ' ').title()
                        print(f"   {clean_key}: {value}")
                break
                
            attempts += 1
        
        if attempts >= 10:
            print("⏰ Maximum processing attempts reached. Operation may be incomplete.")
            
    except Exception as e:
        print(f"❌ Processing error occurred: {e}")
        print("🔄 Attempting to recover and continue...")
        if debug_mode:
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    import sys
    debug = "--debug" in sys.argv
    main(debug_mode=debug)`;
