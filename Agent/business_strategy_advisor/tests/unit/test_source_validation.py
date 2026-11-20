import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.research.source_validation import classify_tier, validate_source, score_source
from strategy_advisor.research.evidence_extraction import extract_sources
from strategy_advisor.domain import ExternalSource
from datetime import datetime, timezone


class TestSourceValidation(unittest.TestCase):
    def test_classify_tier(self):
        self.assertEqual(classify_tier("https://example.gov/report"), "A")
        self.assertEqual(classify_tier("https://reuters.com/x"), "B")
        self.assertEqual(classify_tier("https://randomblog.com/x"), "C")

    def test_validate_source(self):
        src = ExternalSource(source_id="s1", title="t", url="https://x.com", tier="C", retrieved_at=datetime.now(timezone.utc))
        issues = validate_source(src)
        self.assertIn("low_reliability_source", issues)

    def test_extract_sources(self):
        raw = [{"title": "A", "url": "https://a.com", "content": "hello world"}]
        srcs = extract_sources(raw, "q")
        self.assertEqual(len(srcs), 1)
        self.assertEqual(srcs[0].title, "A")


if __name__ == "__main__":
    unittest.main()