import { type Template } from '../types/builder';

export type TemplateKey =
  | 'starter-pack'
  | 'qa-testing'
  | 'data-extraction'
  | 'search-and-extract'
  | 'form-automation'
  | 'act-workflow'
  | 'act-workflow-deployment';

export const starterPackTemplate: Template = {
  name: 'Starter Pack',
  description: 'Nova Act setup with browser debugging',
  cells: [
    `from nova_act import NovaAct
import os

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"`,
    `# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://nova.amazon.com/act/gym/next-dot/search",
    headless=True,
    tty=False
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()`,
    `# Add your nova.act(<prompt>) statement here
nova.act("Find flights from Boston to Wolf on Feb 22nd")`,
    `# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()`,
  ],
};

const qaTestingTemplate: Template = {
  name: 'QA Testing',
  description: 'Automated QA testing script for web applications',
  cells: [
    `"""QA Testing: Web application functionality validation."""
import os
from nova_act import NovaAct

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your Nova Act API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

BOOL_SCHEMA = {"type": "boolean"}
STRING_SCHEMA = {"type": "string"}`,
    `class NovaActQA:
    def __init__(self, nova_instance):
        self.nova = nova_instance

    def AssertTrue(self, prompt):
        result = self.nova.act_get(prompt, schema=BOOL_SCHEMA)
        actual = result.parsed_response if result.matches_schema else False
        print(f"[{'PASS' if actual else 'FAIL'}] {prompt[:40]}...: {actual}")
        return actual

    def AssertStringMatch(self, prompt, expected_string):
        result = self.nova.act_get(prompt, schema=STRING_SCHEMA)
        actual = result.parsed_response if result.matches_schema else ""
        match = actual.lower() == expected_string.lower()
        print(f"[{'PASS' if match else 'FAIL'}] Expected '{expected_string}', Got '{actual}'")
        return match`,

    `nova = NovaAct(starting_page="https://nova.amazon.com/act/gym/next-dot", headless=True, tty=False)
nova.start()`,
    `qa = NovaActQA(nova)

# Navigate to specific planet page
nova.act("Go to Teegarden b destination page")

# Run QA assertions on planet data
mass_check = qa.AssertStringMatch("What is the mass of this planet?", "1.05x Earth")
temp_check = qa.AssertStringMatch("What is the average temperature?", "15C")
gravity_check = qa.AssertStringMatch("What is the surface gravity?", "1.10g")

print(f"\\nAll checks passed: {all([mass_check, temp_check, gravity_check])}")`,
    `# nova.stop()`,
  ],
};

const dataExtractionTemplate: Template = {
  name: 'Data Extraction',
  description: 'Navigate and extract specific information from web pages',
  cells: [
    `"""Data Extraction: Navigate and extract specific information."""
import os
from nova_act import NovaAct

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"`,
    `nova = NovaAct(
    starting_page="https://nova.amazon.com/act/gym/next-dot",
    headless=True,
    tty=False
)
nova.start()`,
    `# Navigate to specific page
nova.act("Go into the Proxima Centauri b page")`,
    `# Extract specific information
result = nova.act_get("Return the gravity and average temperature of this planet")
print(f"Extracted data: {result.parsed_response}")`,
    `# nova.stop()`,
  ],
};

const searchAndExtractTemplate: Template = {
  name: 'Search and Extract',
  description: 'Fill search forms and extract structured data from results',
  cells: [
    `"""Search and Extract: Fill search forms and parse results."""
import os
from nova_act import NovaAct

os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

FLIGHT_SCHEMA = {
    "type": "object",
    "properties": {
        "flight_number": {"type": "string"},
        "price": {"type": "string"}
    }
}`,
    `nova = NovaAct(
    starting_page="https://nova.amazon.com/act/gym/next-dot/search",
    headless=True,
    tty=False
)
nova.start()`,
    `# Fill search form and submit
nova.act("Find flights from Boston to Wolf on February 21, 2026")`,
    `# Extract structured data from results
result = nova.act_get(
    "Return the flight number and price of the cheapest flight",
    schema=FLIGHT_SCHEMA
)

if result.matches_schema:
    flight_info = result.parsed_response
    print(f"Cheapest flight: {flight_info['flight_number']} - $" + "{flight_info['price']}")
else:
    print(f"Raw response: {result.parsed_response}")`,
    `# nova.stop()`,
  ],
};

const formAutomationTemplate: Template = {
  name: 'Form Filling',
  description: 'Multi-step form filling and transaction completion',
  cells: [
    `"""Form Automation: Multi-step form filling and submission."""
import os
from nova_act import NovaAct

os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"`,
    `nova = NovaAct(
    starting_page="https://nova.amazon.com/act/gym/next-dot/booking/step/1",
    headless=True,
    tty=False
)
nova.start()`,
    `# Step 1: Personal information
nova.act("Fill out the form with name John Doe, date of birth January 8, 2025")

# Step 2: Emergency contact
nova.act("Emergency contact is Jane Smith. Relationship is spouse, and phone number is 321-654-0987")`,
    `# Step 3: Medical clearance and preferences
nova.act("Continue to medical clearance and enter that I do have experience with interstellar travel and cryosleep")
nova.act("Select premium pod and scroll down. No additional cargo")`,
    `# Step 4: Payment and confirmation
nova.act("The prepaid code for payment is NOVAACT2025")

nova.act("Complete the booking")
result = nova.act_get("Return the booking number")
print(f"Booking confirmed: {result.parsed_response}")`,
    `# nova.stop()`,
  ],
};

const actWorkflowTemplate: Template = {
  name: 'AWS Workflow (Develop Local)',
  description: 'Run a Nova Act workflow on AWS',
  cells: [
    `import os
import boto3
from nova_act import NovaAct, Workflow


# Workflow configuration
# Use lowercase letters, numbers, and hyphens only.
WORKFLOW_NAME = "PLACEHOLDER"  # Change this to the workflow name you wish to use

# Validate workflow name format
import re
if WORKFLOW_NAME == "PLACEHOLDER":
    raise ValueError("Please replace 'PLACEHOLDER' with your actual workflow name in WORKFLOW_NAME above")
if not re.match(r'^[a-z0-9-]+$', WORKFLOW_NAME):
    raise ValueError("WORKFLOW_NAME must use lowercase letters, numbers, and hyphens only. Current value: " + WORKFLOW_NAME)

# ⚠️ IMPORTANT: Unset API key when using AWS credentials
# Nova Act workflows on AWS use IAM credentials, not API keys.
# If NOVA_ACT_API_KEY is set, it will conflict with AWS authentication.
os.environ.pop("NOVA_ACT_API_KEY", None)

# Configure S3 export (recommended for storing workflow artifacts)
export_config = {
    's3BucketName': 'PLACEHOLDER',  # Replace with your S3 bucket
    's3KeyPrefix': 'nova-act-workflows'     # Optional: prefix for S3 keys
}

# Validate S3 bucket name before creating workflow
if export_config['s3BucketName'] == 'PLACEHOLDER':
    raise ValueError("Please replace 'PLACEHOLDER' with your actual S3 bucket name in the export_config above")

try:
    response = client.create_workflow_definition(
        name=WORKFLOW_NAME,
        exportConfig=export_config
    )
    print(f"Created workflow: {WORKFLOW_NAME}")
except Exception as e:
    print(f"Could not create workflow definition: {e}")

# Browser debugging: Allows you to inspect browser state at localhost:9222
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"`,
    `# ⚠️ PRODUCTION WARNING: Manual __enter__/__exit__ shown below is for the extension only!
# For production code, use one of these recommended patterns instead:
#
# Option 1 - @workflow decorator:
#   @workflow(workflow_definition_name="my-workflow", model_id="nova-act-latest")
#   def my_workflow(payload={}):
#       with NovaAct(starting_page="https://nova.amazon.com/act/gym") as nova:
#           nova.act("your prompt")
#
# Option 2 - with statement:
#   with Workflow(workflow_definition_name="my-workflow", model_id="nova-act-latest") as workflow:
#       with NovaAct(workflow=workflow, starting_page="https://nova.amazon.com/act/gym") as nova:
#           nova.act("your prompt")

workflow = Workflow(
    workflow_definition_name=WORKFLOW_NAME,
    model_id="nova-act-latest"  # Or specify a specific model version
)
workflow.__enter__()

nova = NovaAct(
    workflow=workflow,
    starting_page="https://nova.amazon.com/act/gym/next-dot/search",  # Customize your starting URL
    headless=True,  # Set to False to launch a browser during development
    tty=False
)
nova.start()`,
    `# Workflow Actions: Add your automation prompts here
nova.act("Find flights from Boston to Wolf on Feb 22nd")
print("Workflow action completed")`,
    `# Running this cell will close the Workflow and Nova Act session, as well as the live view
nova.stop()
workflow.__exit__(None, None, None)`,
    `# 📝 Next Step: Save your script for deployment
# Click the "Save Script" button in the control bar above the Build tab.
# This will save your workflow script so you can deploy it to AWS using the Deploy tab.`,
  ],
};

const actWorkflowDeploymentTemplate: Template = {
  name: 'AWS Workflow (Deployment Ready)',
  description: 'AWS-deployable workflow with proper structure',
  cells: [
    `# This template is for illustration only and will NOT run in this Build notebook nor the live view.
# To execute, save it and run it in a terminal via: python <script.py>

import os

from nova_act import NovaAct, Workflow

def main(payload):
    """
    This function is automatically invoked by the AgentCore Runtime handler when using the Deploy tab.
    If you wish to setup your own entrypoint, you can use the Nova Act CLI directly.
    """
    # make sure API key is not being set
    os.environ.pop("NOVA_ACT_API_KEY", None)

    # do any payload processing you need to from the invocation here
    # print(payload)

    with Workflow(
        workflow_definition_name="my-workflow",  # your pre-created WorkflowDefinition name
        model_id="nova-act-latest", # which Nova Act model id you want to use
    ) as workflow:
        with NovaAct(
            starting_page="https://nova.amazon.com/act/gym/next-dot/search",
            workflow=workflow,
            headless=True,  # remote workflows require headless mode
            tty=False
        ) as nova:
            nova.act("Find flights from Boston to Wolf on Feb 22nd")

# will let you run the script locally if desired
if __name__ == "__main__":
    main({})`,
  ],
};

export const templates: Record<TemplateKey, Template> & Record<string, Template | undefined> = {
  'starter-pack': starterPackTemplate,
  'qa-testing': qaTestingTemplate,
  'data-extraction': dataExtractionTemplate,
  'search-and-extract': searchAndExtractTemplate,
  'form-automation': formAutomationTemplate,
  'act-workflow': actWorkflowTemplate,
  'act-workflow-deployment': actWorkflowDeploymentTemplate,
};
