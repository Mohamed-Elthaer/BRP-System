# MCP Protocol Verification

## Initial state
The original transport layer was REST/HTTP only and did not implement the MCP protocol. This was a gap.

## Upgrade performed
Added `McpJsonRpcTransport` in `src/strategy_advisor/research/mcp/transports.py` implementing JSON-RPC 2.0 over streamable HTTP:
- `initialize` (protocol version 2024-11-05, clientInfo)
- `notifications/initialized`
- `tools/list`
- `tools/call` (with isError handling and text-content flattening)
- SSE-framed response handling

## Verification
`tests/integration/test_mcp_protocol.py` (2 tests) spins up an in-process HTTP server speaking JSON-RPC and verifies:
1. Tool discovery returns the advertised tool and invocation returns its text result.
2. Gateway allowlist permits an allowed tool and blocks a disallowed one.

Result: 2/2 passed.

## Live status
No real MCP server credentials/endpoints available. The protocol client is implemented and verified against a conformant mock server; live Tavily MCP verification is blocked by credentials. REST fallback remains separate and clearly labeled.