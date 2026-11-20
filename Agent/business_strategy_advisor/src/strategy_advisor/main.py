"""FastAPI application entry point for BRP Strategic Intelligence."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure src is on path when run as script
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi import FastAPI

from .core.config import get_settings, reset_settings
from .core.logging import configure_logging, get_logger
from .persistence.database import init_db
from .api.routes.health import router as health_router
from .api.routes.strategy import router as strategy_router
from .api.routes.plans import router as plans_router
from .api.routes.research import router as research_router

logger = get_logger("main")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    init_db()
    app = FastAPI(title="BRP Strategic Intelligence", version=settings.service_version)
    app.include_router(health_router)
    app.include_router(strategy_router)
    app.include_router(plans_router)
    app.include_router(research_router)
    logger.info("application created", extra={"provider": settings.bi_provider})
    return app


app = create_app()


def main() -> None:
    import uvicorn
    settings = get_settings()
    # verify port availability
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        if s.connect_ex((settings.host, settings.port)) == 0:
            print(f"Port {settings.port} is already in use", file=sys.stderr)
            sys.exit(1)
    uvicorn.run("strategy_advisor.main:app", host=settings.host, port=settings.port, reload=False)


if __name__ == "__main__":
    main()