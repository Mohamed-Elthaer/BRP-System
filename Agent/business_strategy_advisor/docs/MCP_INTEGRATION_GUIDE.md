# MCP Integration Guide

Configure servers via `McpServerConfig` (registry). Tools are allowlisted per server. All calls go through `McpGateway` which enforces budgets, timeouts, response-size limits, and logging. Transports: mock (tests) and HTTP. Tavily is primary; Brave/Places/Weather are optional interfaces.