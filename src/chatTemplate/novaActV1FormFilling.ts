import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const FORM_FILLING_EXAMPLES = `

**Form Filling-Specific Features:**
- Smart field detection and form completion
- Multi-step forms and file uploads
- Data validation and error handling

**Example Output 1:** Job application form completion script:

\`\`\`python
"""Form filling automation: Complete job application form."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class ApplicationStatus(BaseModel):
    form_completed: bool
    submission_status: str
    confirmation_number: str | None
    errors_encountered: list[str]

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://www.example-company.com/careers/apply",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
nova.act("fill in first name: John")
nova.act("fill in last name: Smith")
nova.act("fill in email: john.smith@email.com")
nova.act("fill in phone number: (555) 123-4567")
nova.act("select experience level: 3-5 years")
nova.act("fill in current job title: Software Developer")
nova.act("upload resume file from desktop")
nova.act("submit the application form")
result = nova.act("verify form submission and get confirmation details", schema=ApplicationStatus.model_json_schema())

if result.matches_schema:
    status = ApplicationStatus.model_validate(result.parsed_response)
    print("Application Form Results:")
    print(f"Form Completed: {status.form_completed}")
    print(f"Submission Status: {status.submission_status}")
    if status.confirmation_number:
        print(f"Confirmation Number: {status.confirmation_number}")
    if status.errors_encountered:
        print(f"Errors: {', '.join(status.errors_encountered)}")
else:
    print("Could not complete job application form.")

# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()
\`\`\`

**Example Output 2:** Survey form completion script:

\`\`\`python
"""Form filling automation: Complete customer feedback survey."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class SurveyCompletion(BaseModel):
    questions_answered: int
    completion_percentage: str
    submission_successful: bool
    feedback_submitted: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://www.example-survey.com/feedback",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
nova.act("rate overall satisfaction: 4 out of 5 stars")
nova.act("select product category: Electronics")
nova.act("choose recommendation likelihood: Very Likely")
nova.act("fill in comments: Great product quality and fast shipping")
nova.act("select age group: 25-34")
nova.act("choose how you heard about us: Social Media")
nova.act("submit the survey form")
result = nova.act("confirm survey submission and get completion status", schema=SurveyCompletion.model_json_schema())

if result.matches_schema:
    survey = SurveyCompletion.model_validate(result.parsed_response)
    print("Survey Completion Results:")
    print(f"Questions Answered: {survey.questions_answered}")
    print(f"Completion: {survey.completion_percentage}")
    print(f"Submitted Successfully: {survey.submission_successful}")
    print(f"Feedback: {survey.feedback_submitted}")
else:
    print("Could not complete customer survey form.")

# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()
\`\`\``;

export const NOVA_ACT_FORM_FILLING_TEMPLATE: ChatTemplate = {
  id: 'nova-act-form-filling',
  name: 'Nova Act Form Filling Template',
  prompt: NOVA_ACT_BASE_CONTENT + FORM_FILLING_EXAMPLES,
};
