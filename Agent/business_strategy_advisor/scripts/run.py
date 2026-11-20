"""Run the BRP Strategic Intelligence service."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

# load .env if present
env_path = ROOT / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())

import uvicorn
from strategy_advisor.main import create_app

if __name__ == "__main__":
    app = create_app()
    settings_host = os.getenv("STRATEGY_HOST", "127.0.0.1")
    settings_port = int(os.getenv("STRATEGY_PORT", "8011"))
    uvicorn.run(app, host=settings_host, port=settings_port)