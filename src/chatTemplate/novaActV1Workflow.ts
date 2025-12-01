import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const WORKFLOW_EXAMPLES = `

**AWS Workflow Features:**
- AWS backend integration with automatic credential discovery
- Workflow orchestration and state management
- Distributed execution coordination
- Resource lifecycle management

**Builder Mode Compatibility:**
For Builder Mode execution, wrap workflow code in a function:

\`\`\`python
def run_workflow(payload={}):
    # Note: VSCode extension requires explicit __enter__/__exit__ calls
    # Do not use 'with' statements - they are not supported
    workflow = Workflow(
        workflow_definition_name="my-workflow",
        model_id="nova-act-latest"
    )
    workflow.__enter__()
    
    nova = NovaAct(
        workflow=workflow,
        headless=True,
        starting_page="https://www.wikipedia.org"
    )
    nova.start()
    
    try:
        # Your workflow actions here
        nova.act("perform task")
    finally:
        nova.stop()
        workflow.__exit__(None, None, None)

run_workflow()
\`\`\`

**Example Output 1:** Convert existing Nova Act script to AWS Workflow:

\`\`\`python
"""Convert Nova Act script to AWS Workflow for deployment."""
import os
from nova_act import Workflow, NovaAct

os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"

workflow = Workflow(
    workflow_definition_name="my-automation-workflow",
    model_id="nova-act-latest"
)
workflow.__enter__()

nova = NovaAct(
    workflow=workflow,
    headless=True,
    starting_page="https://www.wikipedia.org"
)
nova.start()

nova.go_to_url("https://example.com")
nova.act("search for 'product information'")
result = nova.act("extract product details")
print(f"Result: {result.response}")

# Cleanup (uncomment when done)
# nova.stop()
# workflow.__exit__(None, None, None)
\`\`\`

**Example Output 2:** Create new AWS Workflow with structured data extraction:

\`\`\`python
"""New AWS Workflow for web automation tasks."""
import os
from pydantic import BaseModel
from nova_act import Workflow, NovaAct

os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"

class TaskResult(BaseModel):
    status: str
    data: str
    timestamp: str

workflow = Workflow(
    workflow_definition_name="web-automation-task",
    model_id="nova-act-latest"
)
workflow.__enter__()

nova = NovaAct(
    workflow=workflow,
    headless=True,
    starting_page="https://www.wikipedia.org"
)
nova.start()

nova.go_to_url("https://example.com")
nova.act("navigate to the data section")

result = nova.act(
    "extract the required information",
    schema=TaskResult.model_json_schema()
)

if result.matches_schema:
    task_data = TaskResult.model_validate(result.parsed_response)
    print(f"Task completed: {task_data.status}")
    print(f"Data: {task_data.data}")
else:
    print("Task failed - could not extract data")

# Cleanup (uncomment when done)
# nova.stop()
# workflow.__exit__(None, None, None)
\`\`\`

**Workflow Parameters:**
- **workflow_definition_name**: Name identifier for the workflow definition
- **model_id**: AI model identifier for workflow execution (optional)
- **boto_session_kwargs** (optional): Dictionary of kwargs for boto3.Session (defaults to region_name='us-east-1')

**AWS Integration Best Practices:**
- Configure AWS credentials using standard AWS methods (environment variables, IAM roles, or credential files) - credentials are automatically discovered
- Use structured data schemas for reliable extraction
- Implement proper error handling for workflow failures
- Test workflows locally before AWS deployment

**Conversion Guidelines:**
If converting existing Nova Act scripts:
1. Wrap code in a function (e.g., \`def run_workflow(payload={})\`)
2. Replace NovaAct() with NovaAct(workflow=workflow)
3. Add structured schemas for data extraction
4. Call the function at the end (\`run_workflow()\`)`;

export const NOVA_ACT_WORKFLOW_TEMPLATE: ChatTemplate = {
  id: 'nova-act-workflow',
  name: 'Nova Act Workflow Template',
  prompt: NOVA_ACT_BASE_CONTENT + WORKFLOW_EXAMPLES,
};
