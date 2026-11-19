"""
stream_utils.py — Typed SSE streaming helpers (status, token, done, error).
"""

import json
import asyncio
from typing import Any, AsyncGenerator, Optional, Tuple


def format_sse(data: Any, event: Optional[str] = None) -> str:
    payload = json.dumps(data, ensure_ascii=False) if not isinstance(data, str) else data
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    lines.append("")
    lines.append("")
    return "\n".join(lines)


def format_sse_ping() -> str:
    return ": ping\n\n"


async def sse_event_stream(
    generator: AsyncGenerator[Tuple[str, dict[str, Any]], None],
    ping_interval: float = 15.0,
    flush_ms: int = 25,
) -> AsyncGenerator[str, None]:
    """
    Wrap an async generator yielding (event_name, payload_dict) tuples.
    Batches consecutive 'token' events within flush_ms; flushes other events immediately.
    """
    token_buf = ""
    last_flush = asyncio.get_event_loop().time()
    flush_sec = flush_ms / 1000.0
    sent_done = False

    while True:
        try:
            event_name, payload = await asyncio.wait_for(generator.__anext__(), timeout=ping_interval)

            if event_name == "token":
                token_buf += payload.get("text", "")
                now = asyncio.get_event_loop().time()
                if token_buf and (now - last_flush >= flush_sec):
                    yield format_sse({"text": token_buf}, event="token")
                    token_buf = ""
                    last_flush = now
            else:
                if token_buf:
                    yield format_sse({"text": token_buf}, event="token")
                    token_buf = ""
                    last_flush = asyncio.get_event_loop().time()
                if event_name == "done":
                    sent_done = True
                yield format_sse(payload, event=event_name)

        except asyncio.TimeoutError:
            if token_buf:
                yield format_sse({"text": token_buf}, event="token")
                token_buf = ""
                last_flush = asyncio.get_event_loop().time()
            yield format_sse_ping()
        except StopAsyncIteration:
            if token_buf:
                yield format_sse({"text": token_buf}, event="token")
            if not sent_done:
                yield format_sse({"provider": "groq", "tools": []}, event="done")
            break
