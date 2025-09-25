import { type Template } from '../types/builder';

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
    starting_page="https://nova.amazon.com/act",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()`,
    `# Add your nova.act(<prompt>) statement here
nova.act("Click the Learn More button. Then, return the title and publication date of the blog.")`,
    `# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()`,
  ],
};

export const qaTestingTemplate: Template = {
  name: 'QA Testing',
  description: 'Automated QA testing script for web applications',
  cells: [
    `"""QA Testing: Web application functionality validation."""
import os
from nova_act import NovaAct

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

BOOL_SCHEMA = {"type": "boolean"}
STRING_SCHEMA = {"type": "string"}`,
    `class NovaActQA:
    def __init__(self, nova_instance):
        self.nova = nova_instance

    def AssertTrue(self, prompt):
        result = self.nova.act(prompt, schema=BOOL_SCHEMA)
        actual = result.parsed_response if result.matches_schema else False
        print(f"[{'PASS' if actual else 'FAIL'}] {prompt[:40]}...: {actual}")
        return actual

    def AssertStringMatch(self, prompt, expected_string):
        result = self.nova.act(prompt, schema=STRING_SCHEMA)
        actual = result.parsed_response if result.matches_schema else ""
        match = actual.lower() == expected_string.lower()
        print(f"[{'PASS' if match else 'FAIL'}] Expected '{expected_string}', Got '{actual}'")
        return match`,

    `nova = NovaAct(starting_page="https://amazon.science/", headless=True)
nova.start()`,
    `qa = NovaActQA(nova)
search_works = qa.AssertTrue("return true if you are able to type Nova Act in search bar")
create_account_match = qa.AssertStringMatch("what is the text on the left top corner in dark blue color with max border", "amazon science")`,
    `# nova.stop()`,
  ],
};

export const templates: Record<string, Template> = {
  'starter-pack': starterPackTemplate,
  'qa-testing': qaTestingTemplate,
};
