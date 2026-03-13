/**
 * Minimal MCP (Model Context Protocol) server over stdio.
 *
 * Implements the JSON-RPC 2.0 transport used by Claude Desktop / ChatGPT
 * for MCP tool discovery and invocation. Zero external dependencies.
 *
 * Protocol:
 *   - Messages delimited by newlines on stdin
 *   - Responses written as newline-delimited JSON on stdout
 *   - Logging goes to stderr (never stdout)
 */

import { createInterface } from "readline";

export class McpStdioServer {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.tools = new Map(); // name → { description, inputSchema, handler }
  }

  /**
   * Register a tool.
   * @param {string} name
   * @param {string} description
   * @param {object} inputSchema — JSON Schema for parameters
   * @param {function} handler — async (params) => { content: [{type, text}] }
   */
  tool(name, description, inputSchema, handler) {
    this.tools.set(name, { description, inputSchema, handler });
  }

  /** Start listening on stdin. */
  async serve() {
    const rl = createInterface({ input: process.stdin, terminal: false });

    for await (const line of rl) {
      if (!line.trim()) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        this._send({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        });
        continue;
      }

      const response = await this._handleMessage(msg);
      if (response) this._send(response);
    }
  }

  async _handleMessage(msg) {
    const { id, method, params } = msg;

    // ── Lifecycle ───────────────────────────────────────
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: this.name, version: this.version },
        },
      };
    }

    if (method === "notifications/initialized") {
      // Notification — no response
      return null;
    }

    // ── Tool listing ────────────────────────────────────
    if (method === "tools/list") {
      const tools = [];
      for (const [name, t] of this.tools) {
        tools.push({
          name,
          description: t.description,
          inputSchema: {
            type: "object",
            properties: t.inputSchema,
            required: Object.entries(t.inputSchema)
              .filter(([, v]) => !v.optional)
              .map(([k]) => k),
          },
        });
      }
      return { jsonrpc: "2.0", id, result: { tools } };
    }

    // ── Tool invocation ─────────────────────────────────
    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      const tool = this.tools.get(toolName);
      if (!tool) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: `Unknown tool: ${toolName}` },
            ],
            isError: true,
          },
        };
      }

      try {
        const result = await tool.handler(toolArgs);
        return { jsonrpc: "2.0", id, result };
      } catch (err) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: `Tool error: ${err.message}` },
            ],
            isError: true,
          },
        };
      }
    }

    // ── Ping ────────────────────────────────────────────
    if (method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    // ── Unknown method ──────────────────────────────────
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  }

  _send(obj) {
    process.stdout.write(JSON.stringify(obj) + "\n");
  }
}
