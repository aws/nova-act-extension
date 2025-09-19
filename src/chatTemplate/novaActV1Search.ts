import { type ChatTemplate, NOVA_ACT_BASE_CONTENT } from './novaActV1Base';

const SEARCH_EXAMPLES = `

**Search-Specific Features:**
- Multi-source search and information gathering
- Search refinement and result analysis
- Information synthesis and comparison

**Example Output 1:** Wikipedia information search script:

\`\`\`python
"""Search automation: Find and extract information from Wikipedia."""
import os
from pydantic import BaseModel
from typing import List
from nova_act import NovaAct

class WikipediaArticle(BaseModel):
    title: str
    summary: str
    main_sections: List[str]
    key_facts: List[str]
    references_count: str
    last_updated: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://wikipedia.org",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
nova.act("search for 'artificial intelligence'")
nova.act("select the main Wikipedia article about artificial intelligence")
nova.act("extract the article summary and main section headings")
result = nova.act("gather comprehensive information about the topic", schema=WikipediaArticle.model_json_schema())

if result.matches_schema:
    article = WikipediaArticle.model_validate(result.parsed_response)
    print("Wikipedia article information:")
    print(f"Title: {article.title}")
    print(f"Summary: {article.summary}")
    print(f"Main Sections: {', '.join(article.main_sections)}")
    print(f"Key Facts: {', '.join(article.key_facts)}")
    print(f"References: {article.references_count}")
    print(f"Last Updated: {article.last_updated}")
else:
    print("Could not extract Wikipedia article information.")

# Running nova.stop will close the browser and end the Nova Act session.
# Uncomment the following line to mark the end of the Nova Act execution.
# nova.stop()
\`\`\`

**Example Output 2:** Comparative search:

\`\`\`python
"""Search automation: Search information ."""
import os
from pydantic import BaseModel
from nova_act import NovaAct

class SearchResult(BaseModel):
    source: str
    title: str
    summary: str
    date: str
    credibility_score: str

# Browser args enables browser debugging on port 9222.
os.environ["NOVA_ACT_BROWSER_ARGS"] = "--remote-debugging-port=9222"
# Get your API key from https://nova.amazon.com/act
# Set API Key using Set API Key command (CMD/Ctrl+Shift+P) or set it below.
# Get your Nova Act API key from nova.amazon.com/act
# os.environ["NOVA_ACT_API_KEY"] = "<YOUR_API_KEY>"

# Initialize Nova Act with your starting page.
nova = NovaAct(
    starting_page="https://www.example-search.com",
    headless=True
)

# Running nova.start will launch a new browser instance.
# Only one nova.start() call is needed per Nova Act session.
nova.start()

# Add your nova.act(<prompt>) statement here
search_topic = "climate change renewable energy 2024"
nova.act(f"search for '{search_topic}'")
nova.act("find the top 3 most authoritative sources")
nova.act("extract key information from each source")
result = nova.act("summarize findings with source credibility assessment", schema=SearchResult.model_json_schema())

if result.matches_schema:
    search_result = SearchResult.model_validate(result.parsed_response)
    print("Search results summary:")
    print(f"Source: {search_result.source}")
    print(f"Title: {search_result.title}")
    print(f"Summary: {search_result.summary}")
    print(f"Date: {search_result.date}")
    print(f"Credibility: {search_result.credibility_score}")
else:
    print("Could not complete the comparative search analysis.")

# Running nova.stop will close the browser and end the Nova Act session.
# Uncomment the following line to mark the end of the Nova Act execution.
# nova.stop()
\`\`\``;

export const NOVA_ACT_SEARCH_TEMPLATE: ChatTemplate = {
  id: 'nova-act-search',
  name: 'Nova Act Search Template',
  prompt: NOVA_ACT_BASE_CONTENT + SEARCH_EXAMPLES,
};
