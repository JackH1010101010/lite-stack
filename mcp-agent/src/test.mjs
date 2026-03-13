#!/usr/bin/env node

/**
 * Test harness for Lite-Stack MCP Agent.
 *
 * Sends JSON-RPC messages to the MCP server via stdin/stdout
 * and validates responses. Run with: node src/test.mjs
 */

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log("=== Lite-Stack MCP Agent Tests ===\n");

  // Start the MCP server as a child process
  const serverPath = resolve(__dirname, "index.mjs");
  const child = spawn("node", [serverPath], {
    env: {
      ...process.env,
      LITEAPI_API_KEY: process.env.LITEAPI_API_KEY || process.env.LITEAPI_SANDBOX_PUBLIC_KEY || "test-key",
      POSTHOG_PROJECT_KEY: process.env.POSTHOG_PROJECT_KEY || "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Collect stderr for logging
  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  // Response buffer
  let responseBuffer = "";
  const responseQueue = [];
  let responseResolve = null;

  child.stdout.on("data", (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split("\n");
    responseBuffer = lines.pop(); // Keep incomplete line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (responseResolve) {
          const r = responseResolve;
          responseResolve = null;
          r(parsed);
        } else {
          responseQueue.push(parsed);
        }
      } catch {
        console.error("  [stdout parse error]", line.slice(0, 100));
      }
    }
  });

  function waitForResponse(timeoutMs = 5000) {
    if (responseQueue.length > 0) {
      return Promise.resolve(responseQueue.shift());
    }
    return new Promise((resolve, reject) => {
      responseResolve = resolve;
      setTimeout(() => {
        responseResolve = null;
        reject(new Error("Timeout waiting for response"));
      }, timeoutMs);
    });
  }

  function send(msg) {
    child.stdin.write(JSON.stringify(msg) + "\n");
  }

  // ── Test: Initialize ──────────────────────────────────────────

  test("initialize handshake", async () => {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-harness", version: "1.0.0" },
      },
    });

    const res = await waitForResponse();
    assert(res.result, "Should have result");
    assert(res.result.serverInfo.name === "lite-stack-hotels", `Server name should be lite-stack-hotels, got ${res.result.serverInfo.name}`);
    assert(res.result.capabilities.tools, "Should have tools capability");
  });

  // ── Test: List tools ──────────────────────────────────────────

  test("tools/list returns 5 tools", async () => {
    send({ jsonrpc: "2.0", id: 2, method: "notifications/initialized" });
    // Notification — no response expected

    send({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} });
    const res = await waitForResponse();
    assert(res.result, "Should have result");
    assert(Array.isArray(res.result.tools), "Should have tools array");
    assert(res.result.tools.length === 5, `Should have 5 tools, got ${res.result.tools.length}`);

    const names = res.result.tools.map((t) => t.name).sort();
    const expected = [
      "complete_booking",
      "get_hotel_details",
      "get_rates",
      "pre_book",
      "search_hotels",
    ];
    assert(
      JSON.stringify(names) === JSON.stringify(expected),
      `Tool names should be ${expected.join(", ")}, got ${names.join(", ")}`
    );

    // Verify tool schemas
    for (const tool of res.result.tools) {
      assert(tool.description, `Tool ${tool.name} should have description`);
      assert(tool.inputSchema, `Tool ${tool.name} should have inputSchema`);
    }
  });

  // ── Test: Quality score computation ───────────────────────────

  test("quality score: 5-star hotel with good reviews", async () => {
    // Import directly for unit testing
    const { computeQualityScore } = await import("./quality-score.mjs");

    const result = computeQualityScore({
      starRating: 5,
      reviewScore: 9.2,
      reviewCount: 1500,
      amenities: ["spa", "pool", "restaurant", "gym"],
    });

    assert(result.lite_stack_quality_score >= 9.0, `5★ hotel with 9.2 reviews should score ≥9.0, got ${result.lite_stack_quality_score}`);
    assert(result.quality_label === "Exceptional" || result.quality_label === "Outstanding",
      `Should be Exceptional or Outstanding, got ${result.quality_label}`);
    assert(result.score_breakdown.base === 8.0, "Base should be 8.0 for 5★");
    assert(result.score_breakdown.review_boost === 1.0, "Review boost should be 1.0 for 9.2");
    assert(result.score_breakdown.volume_boost === 0.5, "Volume boost should be 0.5 for 1500 reviews");
  });

  test("quality score: 3-star budget hotel", async () => {
    const { computeQualityScore } = await import("./quality-score.mjs");

    const result = computeQualityScore({
      starRating: 3,
      reviewScore: 7.5,
      reviewCount: 200,
      amenities: ["wifi", "parking"],
    });

    assert(result.lite_stack_quality_score >= 5.0 && result.lite_stack_quality_score <= 6.0,
      `3★ budget hotel should score 5-6, got ${result.lite_stack_quality_score}`);
  });

  // ── Test: CUG rate framing ────────────────────────────────────

  test("CUG framing: adds savings percentage and framing text", async () => {
    const { frameCUGRate } = await import("./cug-framing.mjs");

    const rate = { price: 200, offerId: "test-offer-123" };
    const framed = frameCUGRate(rate, "GBP");

    assert(framed.rate_type === "member_exclusive", "Should be member_exclusive");
    assert(framed.cug_rate > 0, "Should have CUG rate");
    assert(framed.cug_rate === 230, `CUG rate should be 200*1.15=230, got ${framed.cug_rate}`);
    assert(framed.savings_percentage > 0, "Should have savings percentage");
    assert(framed.framing_text.includes("£"), "Framing text should include £ symbol");
    assert(framed.framing_text.includes("below typical OTA"), "Should mention OTA comparison");
  });

  // ── Test: Ping ────────────────────────────────────────────────

  test("ping responds", async () => {
    send({ jsonrpc: "2.0", id: 99, method: "ping" });
    const res = await waitForResponse();
    assert(res.id === 99, "Should echo id");
    assert(res.result !== undefined, "Should have result");
  });

  // ── Run all tests ─────────────────────────────────────────────

  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.name}: ${err.message}`);
    }
  }

  // Cleanup
  child.kill("SIGTERM");

  console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
  if (stderr) {
    console.log("\n--- Server stderr ---");
    console.log(stderr.trim());
  }

  process.exit(failed > 0 ? 1 : 0);
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

runTests();
