# MCP Protocol Verification

## Supported protocol versions
2024-11-05, 2025-03-26, 2025-06-18 (negotiated via initialize; falls back to older versions on unsupported-version errors).

## Transport architecture
- `MockTransport`: in-memory for tests.
- `HttpTransport`: generic REST (not MCP protocol) — kept separate.
- `McpJsonRpcTransport`: real MCP JSON-RPC 2.0 over streamable HTTP. Stateless (no session id). Sends `MCP-Protocol-Version` header. Handles JSON and SSE responses, HTTP errors, timeouts, malformed JSON.

## Modern vs legacy
Modern: stateless, POST-based, protocol version header, `_meta` metadata. Legacy: initialize/initialized handshake preserved for older servers. Version negotiation tries configured version first, then older ones.

## Test results
- `tests/integration/test_mcp_protocol.py`: 2 tests, PASS (discovery + invocation; allowlist enforcement).
- Version negotiation exercised against mock returning 2024-11-05.

## Real-server interoperability
BLOCKED: no real MCP endpoint/credentials available. Protocol client implemented and verified against a conformant mock server.

## Known limitations
- No live server tested.
- SSE streaming responses handled by extracting last `data:` line.
- No OAuth flow implemented (bearer token only).