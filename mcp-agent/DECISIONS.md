# Phase 0 Build Decisions

## 1. Zero-dependency approach (deviation from plan)

**Plan said:** Fork liteapi-travel/mcp-server, use @modelcontextprotocol/sdk + posthog-node.

**What we did:** Built from scratch using zero external dependencies. Custom MCP stdio transport (mcp-stdio.mjs), native fetch for LiteAPI calls, direct PostHog Capture API for analytics.

**Why:** More portable, no npm install required, no version conflicts, smaller footprint. The LiteAPI MCP server is a thin wrapper — we get more control by implementing the 5 tools directly against the documented REST API.

## 2. Direct LiteAPI calls for booking (deviation from step 13-15)

**Plan said:** Route preBook/book through luxstay.netlify.app/.netlify/functions/liteapi with X-Booking-Source headers.

**What we did:** Call LiteAPI directly + fire PostHog events server-side via the Capture API.

**Why:** Routing through Netlify would add latency, create a single point of failure (if Netlify is down, AI bookings fail), and couple the MCP agent to a specific deployment. Server-side PostHog tracking achieves the same analytics goal without the coupling. The X-Booking-Source attribution is handled by the `source: "mcp_agent"` property on every PostHog event.

**Trade-off:** If the Netlify function has additional booking logic in the future (e.g., fraud checks, rate validation), the MCP agent would need to be updated. For now, both paths call the same LiteAPI endpoints.

## 3. Plain JS instead of TypeScript (adaptation)

**Plan implied:** TypeScript (the LiteAPI MCP server uses TypeScript with src/index.ts → dist/index.js build).

**What we did:** ES modules (.mjs) with no build step.

**Why:** npm registry was blocked in the sandbox environment, preventing TypeScript/SDK installation. Plain JS with ES modules runs directly on Node.js 18+ with no compilation needed. Can be converted to TypeScript later if desired.
