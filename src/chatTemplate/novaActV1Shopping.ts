import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const SHOPPING_EXAMPLES = `

**Shopping-Specific Features:**
- Product search, price comparison, cart management, and checkout processes
- Authentication for logged-in shopping experiences
- Avoid sensitive operations like payment processing

**Example Output 1:** Product search and comparison script:

\`\`\`python
"""Shopping automation: Search and compare wireless headphones."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class HeadphoneProduct(BaseModel):
    name: str
    price: str
    rating: str
    reviews_count: str
    features: list[str]
    availability: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://example-shopping.com",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
nova.act("search for 'wireless headphones'")
nova.act("filter results by price range $50-$100")
nova.act("sort by customer ratings highest first")
nova.act("select the top-rated product from the results")
result = nova.act("extract detailed product information", schema=HeadphoneProduct.model_json_schema())

if result.matches_schema:
    headphones = HeadphoneProduct.model_validate(result.parsed_response)
    print("Best headphones found:")
    print(f"Product: {headphones.name}")
    print(f"Price: {headphones.price}")
    print(f"Rating: {headphones.rating} ({headphones.reviews_count} reviews)")
    print(f"Features: {', '.join(headphones.features)}")
    print(f"Availability: {headphones.availability}")
else:
    print("Could not extract headphone product information.")

# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()
\`\`\`

**Example Output 2:** Add to cart automation script:

\`\`\`python
"""Shopping automation: Add specific product to cart."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class ProductDetails(BaseModel):
    name: str
    price: str
    availability: str
    cart_status: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://www.example-store.com",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
nova.act("search for 'coffee maker'")
nova.act("select the first product with 4+ stars and free shipping")
nova.act("choose quantity 1 and add to cart")
result = nova.act("return product details and cart confirmation", schema=ProductDetails.model_json_schema())

if result.matches_schema:
    product = ProductDetails.model_validate(result.parsed_response)
    print(f"Product: {product.name}")
    print(f"Price: {product.price}")
    print(f"Availability: {product.availability}")
    print(f"Cart Status: {product.cart_status}")
else:
    print("Could not complete the shopping task.")

# Leaving nova.stop() commented keeps NovaAct session running.
# To stop a NovaAct instance, press "Restart Notebook" (top-right) or uncomment nova.stop() - note this also shuts down the browser instantiated by NovaAct so subsequent nova.act() calls will fail.
# nova.stop()
\`\`\``;

export const NOVA_ACT_SHOPPING_TEMPLATE: ChatTemplate = {
  id: 'nova-act-shopping',
  name: 'Nova Act Shopping Template',
  prompt: NOVA_ACT_BASE_CONTENT + SHOPPING_EXAMPLES,
};
