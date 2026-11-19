# BRP Restaurant Owner AI Agent

Read-only FastAPI + Groq AI Agent connected directly to BRP-System's MongoDB database.

## Setup & Run

```powershell
cd full_project\BRP-System\Agent
pip install -r requirements.txt
cd backend
python app.py
```

The agent listens on `http://127.0.0.1:8005` (`GET /health`, `POST /chat/stream` protected by `X-Agent-Secret`).
If the agent is stopped, BRP-System's Node backend automatically falls back to its built-in live ERP replies.
