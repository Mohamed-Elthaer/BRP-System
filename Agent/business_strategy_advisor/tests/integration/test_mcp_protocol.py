import http.server
import json
import threading
import os, sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))

from strategy_advisor.research.mcp.transports import McpJsonRpcTransport
from strategy_advisor.research.mcp.models import McpServerConfig
from strategy_advisor.research.mcp.gateway import McpGateway
from strategy_advisor.research.mcp.registry import McpServerRegistry


class _McpHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n))
        method = body.get("method")
        if method == "initialize":
            resp = {"jsonrpc": "2.0", "id": body["id"], "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "mock", "version": "1"}}}
        elif method == "notifications/initialized":
            self.send_response(204); self.end_headers(); return
        elif method == "tools/list":
            resp = {"jsonrpc": "2.0", "id": body["id"], "result": {"tools": [{"name": "search", "description": "search", "inputSchema": {"type": "object"}}]}}
        elif method == "tools/call":
            name = body["params"]["name"]
            resp = {"jsonrpc": "2.0", "id": body["id"], "result": {"content": [{"type": "text", "text": f"result for {name}"}], "isError": False}}
        else:
            resp = {"jsonrpc": "2.0", "id": body.get("id"), "error": {"code": -32601, "message": "method not found"}}
        data = json.dumps(resp).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


class TestMcpProtocol(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = http.server.HTTPServer(("127.0.0.1", 0), _McpHandler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def test_discover_and_call(self):
        transport = McpJsonRpcTransport(f"http://127.0.0.1:{self.port}/mcp", timeout=5)
        cfg = McpServerConfig(server_id="mock", provider="mock", transport="http", endpoint=f"http://127.0.0.1:{self.port}/mcp", enabled_tools=["search"])
        tools = transport.discover_tools(cfg)
        self.assertEqual(len(tools), 1)
        self.assertEqual(tools[0]["name"], "search")
        res = transport.call_tool(cfg, "search", {"query": "x"})
        self.assertTrue(res.success)
        self.assertIn("result for search", str(res.data))

    def test_gateway_allowlist(self):
        reg = McpServerRegistry()
        cfg = McpServerConfig(server_id="mock", provider="mock", transport="http", endpoint=f"http://127.0.0.1:{self.port}/mcp", enabled_tools=["search"])
        reg.register(cfg)
        transport = McpJsonRpcTransport(f"http://127.0.0.1:{self.port}/mcp", timeout=5)
        gw = McpGateway(reg, {"mock": transport})
        from strategy_advisor.research.mcp.models import McpToolCall
        r = gw.call(McpToolCall(server_id="mock", tool_name="search", arguments={"q": "x"}))
        self.assertTrue(r.success)
        r2 = gw.call(McpToolCall(server_id="mock", tool_name="not_allowed", arguments={}))
        self.assertFalse(r2.success)


if __name__ == "__main__":
    unittest.main()