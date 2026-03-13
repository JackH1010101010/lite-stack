#!/usr/bin/env node

/**
 * Live integration test — calls actual LiteAPI sandbox.
 * Tests the full search → details → rates flow.
 */

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let msgId = 0;
function nextId() { return ++msgId; }

async function main() {
  console.log("=== Live Integration Test (LiteAPI Sandbox) ===\n");

  const child = spawn("node", [resolve(__dirname, "index.mjs")], {
    env: {
      ...process.env,
      LITEAPI_SANDBOX_PUBLIC_KEY: process.env.LITEAPI_SANDBOX_PUBLIC_KEY || "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d.toString(); });

  let buf = "";
  const queue = [];
  let resolver = null;

  child.stdout.on("data", (data) => {
    buf += data.toString();
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (resolver) { const r = resolver; resolver = null; r(parsed); }
        else queue.push(parsed);
      } catch {}
    }
  });

  function waitFor(ms = 15000) {
    if (queue.length > 0) return Promise.resolve(queue.shift());
    return new Promise((resolve, reject) => {
      resolver = resolve;
      setTimeout(() => { resolver = null; reject(new Error("Timeout")); }, ms);
    });
  }

  function send(msg) {
    child.stdin.write(JSON.stringify(msg) + "\n");
  }

  try {
    // Initialize
    send({ jsonrpc: "2.0", id: nextId(), method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "live-test", version: "1.0.0" } } });
    await waitFor();
    send({ jsonrpc: "2.0", method: "notifications/initialized" });

    // 1. Search hotels in Dubai
    console.log("1. Searching hotels in Dubai (AE)...");
    send({ jsonrpc: "2.0", id: nextId(), method: "tools/call", params: {
      name: "search_hotels",
      arguments: { country_code: "AE", city_name: "Dubai", min_star_rating: 5, limit: 5 },
    }});
    const searchRes = await waitFor(15000);
    const searchContent = searchRes?.result?.content?.[0]?.text || "";
    console.log("   Result:", searchContent.slice(0, 300));

    // Parse hotel IDs from the JSON response
    let hotelIds = [];
    try {
      const jsonContent = searchRes?.result?.content?.[1]?.text;
      if (jsonContent) {
        const parsed = JSON.parse(jsonContent);
        hotelIds = (parsed.hotels || []).slice(0, 2).map(h => h.id || h.hotelId).filter(Boolean);
      }
    } catch {}

    if (hotelIds.length === 0) {
      console.log("   ⚠ No hotel IDs found. Search may have returned empty or different schema.");
      console.log("   Full response:", JSON.stringify(searchRes?.result?.content, null, 2).slice(0, 500));
    } else {
      console.log(`   Found ${hotelIds.length} hotel IDs: ${hotelIds.join(", ")}`);

      // 2. Get hotel details for first hotel
      console.log(`\n2. Getting details for hotel ${hotelIds[0]}...`);
      send({ jsonrpc: "2.0", id: nextId(), method: "tools/call", params: {
        name: "get_hotel_details",
        arguments: { hotel_id: hotelIds[0] },
      }});
      const detailsRes = await waitFor(15000);
      const detailsContent = detailsRes?.result?.content?.[0]?.text || "";
      console.log("   Result:", detailsContent.slice(0, 300));

      // 3. Get rates
      console.log(`\n3. Getting rates for ${hotelIds.length} hotels...`);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];

      send({ jsonrpc: "2.0", id: nextId(), method: "tools/call", params: {
        name: "get_rates",
        arguments: { hotel_ids: hotelIds, checkin: tomorrow, checkout: dayAfter, adults: 2, currency: "GBP" },
      }});
      const ratesRes = await waitFor(15000);
      const ratesContent = ratesRes?.result?.content?.[0]?.text || "";
      console.log("   Result:", ratesContent.slice(0, 400));

      // Check for CUG framing in rates response
      const ratesJson = ratesRes?.result?.content?.[1]?.text || "";
      if (ratesJson.includes("member_exclusive")) {
        console.log("   ✓ CUG framing present in rates response");
      } else {
        console.log("   ⚠ CUG framing not found — rates may be empty or schema different");
      }
    }

    console.log("\n=== Integration test complete ===");
  } catch (err) {
    console.error("Test error:", err.message);
  } finally {
    child.kill("SIGTERM");
    if (stderr) {
      console.log("\n--- Server stderr ---");
      console.log(stderr.trim());
    }
  }
}

main();
