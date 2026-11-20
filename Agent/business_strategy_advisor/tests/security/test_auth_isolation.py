import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.security.permissions import require_api_key


class TestAuthIsolation(unittest.TestCase):
    def test_no_key_when_required(self):
        self.assertFalse(require_api_key(None, "secret", True))

    def test_wrong_key(self):
        self.assertFalse(require_api_key("wrong", "secret", True))

    def test_correct_key(self):
        self.assertTrue(require_api_key("secret", "secret", True))

    def test_not_required(self):
        self.assertTrue(require_api_key(None, None, False))


if __name__ == "__main__":
    unittest.main()