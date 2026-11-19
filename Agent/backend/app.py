"""
app.py — FastAPI Server for BRP Restaurant Owner AI Agent.
Listens on localhost (127.0.0.1:8005) and accepts requests proxied by Node Backend
using X-Agent-Secret authentication.
"""

import hmac
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from erp_agent import RestaurantERPAgent
from mongo_engine import MongoERPEngine
from stream_utils import sse_event_stream

app = FastAPI(title="BRP Restaurant ERP AI Agent", version="2.0.0")

mongo_engine = MongoERPEngine()
erp_agent = RestaurantERPAgent(engine=mongo_engine)


def verify_secret(x_agent_secret: Optional[str]) -> None:
    expected = os.getenv("AGENT_SECRET", "")
    if not expected:
        return
    if not x_agent_secret or not hmac.compare_digest(x_agent_secret, expected):
        raise HTTPException(status_code=401, detail="Unauthorized agent request")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@app.get("/health")
async def health():
    mongo_ok = mongo_engine.ping()
    return {
        "status": "ok" if mongo_ok else "error",
        "mongo": mongo_ok,
        "groq_configured": bool(os.getenv("GROQ_API_KEY") or os.getenv("ARIA_GROQ_API_KEY")),
    }


@app.post("/chat/stream")
async def chat_stream(
    req: ChatRequest,
    x_agent_secret: Optional[str] = Header(default=None),
):
    verify_secret(x_agent_secret)
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    history = [{"role": m.role, "content": m.content} for m in (req.history or [])[-8:]]
    generator = erp_agent.stream_response(message=message, history=history)

    return StreamingResponse(
        sse_event_stream(generator, ping_interval=15.0, flush_ms=25),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("AGENT_HOST", "127.0.0.1")
    port = int(os.getenv("AGENT_PORT", "8005"))
    uvicorn.run("app:app", host=host, port=port, reload=True)
