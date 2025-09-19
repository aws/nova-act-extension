import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const QA_EXAMPLES = `

**QA Testing-Specific Features:**
- UI validation, functionality testing, and user journey verification
- Cross-browser testing and test result validation
- Error detection and test reporting

**Example Output 1:** Amazon Science website QA testing script:

\`\`\`python
"""QA Testing: Amazon Science website functionality validation."""
import os
from nova_act import NovaAct

BOOL_SCHEMA = {"type": "boolean"}
STRING_SCHEMA = {"type": "string"}

class NovaActQA:
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
        return match

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

nova = NovaAct(starting_page="https://amazon.science/", headless=True)
nova.start()

qa = NovaActQA(nova)
search_works = qa.AssertTrue("return true if you are able to type Nova Act in search bar")
create_account_match = qa.AssertStringMatch("what is the text on the left top corner in dark blue color with max border", "amazon science")

# nova.stop()
\`\`\`

**Example Output 2:** Shopping cart QA testing script:

\`\`\`python
"""QA Testing: Shopping cart functionality validation."""
import os
from nova_act import NovaAct

BOOL_SCHEMA = {"type": "boolean"}
STRING_SCHEMA = {"type": "string"}

class NovaActQA:
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
        return match

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

nova = NovaAct(starting_page="https://example-shopping.com", headless=True)
nova.start()

qa = NovaActQA(nova)

nova.act("search for coffee maker")
nova.act("select the first 5 from the search results")
nova.act("add it to the cart")
nova.act("go to cart to view items")

# QA Assertions
cart_has_items = qa.AssertTrue("return true if there is at least 1 item in the cart")
cart_item_count = qa.AssertStringMatch("how many items are in the cart", "1")
coffee_maker_in_cart = qa.AssertStringMatch("what is the product title of the item in cart", "coffee maker")

# nova.stop()
\`\`\``;

export const NOVA_ACT_QA_TESTS_TEMPLATE: ChatTemplate = {
  id: 'nova-act-qa-tests',
  name: 'Nova Act QA Tests Template',
  prompt: NOVA_ACT_BASE_CONTENT + QA_EXAMPLES,
};
