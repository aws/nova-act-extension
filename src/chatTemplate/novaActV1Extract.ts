import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const EXTRACT_EXAMPLES = `

**Data Extraction-Specific Features:**
- Structured data extraction using Pydantic BaseModel schemas
- Rate limiting and respectful data collection
- Authentication for accessing protected content

**Example Output 1:** Finance stock data extraction script:

\`\`\`python
"""Data extraction: Extract stock information from Financal website."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class StockData(BaseModel):
    symbol: str
    previous_close: str
    open_price: str
    bid: str
    ask: str
    days_range: str
    week_52_range: str
    volume: str
    avg_volume: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://finance.example.com/quote/AMZN/",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
result = nova.act("extract all stock data including Previous Close, Open, Bid, Ask, Day's Range, 52 Week Range, Volume, and Average Volume", schema=StockData.model_json_schema())

if result.matches_schema:
    stock = StockData.model_validate(result.parsed_response)
    print("Extracted AMZN stock information:")
    print(f"Symbol: {stock.symbol}")
    print(f"Previous Close: {stock.previous_close}")
    print(f"Open: {stock.open_price}")
    print(f"Bid: {stock.bid}")
    print(f"Ask: {stock.ask}")
    print(f"Day's Range: {stock.days_range}")
    print(f"52 Week Range: {stock.week_52_range}")
    print(f"Volume: {stock.volume}")
    print(f"Avg. Volume: {stock.avg_volume}")
else:
    print("Could not extract stock data in the expected format.")

# Running nova.stop will close the browser and end the Nova Act session.
# Uncomment the following line to mark the end of the Nova Act execution.
# nova.stop()
\`\`\`

**Example Output 2:** Amazon news extraction script:

\`\`\`python
"""Data extraction: Extract latest Amazon news articles."""
import os
from pydantic import BaseModel
from typing import List
from nova_act import NovaAct

class NewsArticle(BaseModel):
    title: str
    date: str
    summary: str
    url: str

class AmazonNews(BaseModel):
    articles: List[NewsArticle]

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://www.aboutamazon.com/news",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
result = nova.act("extract the top 4 latest Amazon news articles with their titles, dates, and summaries", schema=AmazonNews.model_json_schema())

if result.matches_schema:
    news = AmazonNews.model_validate(result.parsed_response)
    print("Latest Amazon News Articles:")
    for i, article in enumerate(news.articles, 1):
        print(f"\\n{i}. {article.title}")
        print(f"   Date: {article.date}")
        print(f"   Summary: {article.summary}")
        print(f"   URL: {article.url}")
else:
    print("Could not extract Amazon news articles in the expected format.")

# Running nova.stop will close the browser and end the Nova Act session.
# Uncomment the following line to mark the end of the Nova Act execution.
# nova.stop()
\`\`\``;

export const NOVA_ACT_EXTRACT_TEMPLATE: ChatTemplate = {
  id: 'nova-act-extract',
  name: 'Nova Act Extract Template',
  prompt: NOVA_ACT_BASE_CONTENT + EXTRACT_EXAMPLES,
};
