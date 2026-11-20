"""Live integration tests (skipped unless credentials are present)."""

import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))


@unittest.skipUnless(os.getenv("GROQ_API_KEY"), "GROQ_API_KEY not set")
class TestLiveGroq(unittest.TestCase):
    def test_groq_reasoning(self):
        from strategy_advisor.integrations.llm.client import LlmClient
        c = LlmClient()
        self.assertTrue(c.available())
        out = c.complete("You are helpful.", "Say hello in one word.")
        self.assertTrue(out)


@unittest.skipUnless(os.getenv("TAVILY_API_KEY") or os.getenv("TAVILY_MCP_URL"), "Tavily not configured")
class TestLiveTavily(unittest.TestCase):
    def test_tavily_configured(self):
        from strategy_advisor.core.config import get_settings
        s = get_settings()
        self.assertTrue(s.tavily_api_key or s.tavily_mcp_url)


@unittest.skipUnless(os.getenv("BI_BASE_URL"), "BI_BASE_URL not set")
class TestLiveBI(unittest.TestCase):
    def test_bi_health(self):
        import asyncio
        from strategy_advisor.integrations.business_intelligence.http_adapter import HttpBusinessEvidenceProvider
        p = HttpBusinessEvidenceProvider(os.environ["BI_BASE_URL"])
        self.assertTrue(asyncio.run(p.health_check()))


if __name__ == "__main__":
    unittest.main()