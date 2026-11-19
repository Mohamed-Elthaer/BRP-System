import api from "./Axios";
import { unwrap } from "./helpers";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getBriefing = async () => unwrap(await api.get("/ai/briefing"));
export const sendAiMessage = async (payload) => unwrap(await api.post("/ai/chat", payload));

export async function streamAiMessage({ message, history, onStatus, onToken, onDone, onError }) {
  const res = await fetch(`${BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:expired"));
    throw new Error("Session expired");
  }

  if (!res.ok || !res.body) {
    let msg = "Failed to connect to AI Assistant";
    try {
      const err = await res.json();
      if (err?.message) msg = err.message;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const handleBlock = (block) => {
    const lines = block.split(/\r?\n/);
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) return;
    let payload = dataLines.join("\n");
    try {
      payload = JSON.parse(payload);
    } catch {}

    if (eventName === "status") onStatus?.(payload?.text || "");
    else if (eventName === "token") onToken?.(payload?.text || "");
    else if (eventName === "done") onDone?.(payload || {});
    else if (eventName === "error") onError?.(payload?.message || "AI stream error");
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || "";
    for (const part of parts) {
      if (part.trim()) handleBlock(part);
    }
  }

  if (buffer.trim()) handleBlock(buffer);
}
