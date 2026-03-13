# Lite-Stack MCP Agent

AI hotel booking agent with exclusive CUG (Closed User Group) wholesale rates via LiteAPI.

## What it does

Gives AI assistants (Claude Desktop, ChatGPT, etc.) the ability to:

- **Search hotels** by city/country with proprietary quality scores
- **Get hotel details** including amenities, photos, and Lite-Stack ratings
- **Check live rates** with CUG member pricing (typically 15-25% below OTA)
- **Pre-book** to lock in rates and confirm availability
- **Complete bookings** with guest details

Every interaction is tracked via PostHog for AI agent channel analytics.

## Setup

### 1. Environment variables

Create a `.env` file or set these in your shell:

```bash
# Required — your LiteAPI key (sandbox or production)
LITEAPI_API_KEY=your_liteapi_key_here

# Optional — enables PostHog analytics
POSTHOG_PROJECT_KEY=your_posthog_key_here
```

The server checks for keys in this order:
`LITEAPI_API_KEY` → `LITEAPI_PROD_KEY` → `LITEAPI_SANDBOX_KEY` → `LITEAPI_SANDBOX_PUBLIC_KEY`

### 2. Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lite-stack-hotels": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-agent/src/index.mjs"],
      "env": {
        "LITEAPI_API_KEY": "your_key_here",
        "POSTHOG_PROJECT_KEY": "your_posthog_key_here"
      }
    }
  }
}
```

### 3. Test

```bash
cd mcp-agent
node src/test.mjs
```

## Tools

| Tool | Description |
|------|-------------|
| `search_hotels` | Find hotels by city/country with quality scores |
| `get_hotel_details` | Full hotel info + proprietary quality rating |
| `get_rates` | Live rates with CUG savings framing |
| `pre_book` | Lock in rate, confirm availability |
| `complete_booking` | Finalise reservation with guest details |

## Architecture

Zero external dependencies — uses Node.js built-in `fetch` and `readline`.

```
src/
  index.mjs         — MCP server entry point, tool definitions
  mcp-stdio.mjs     — Minimal MCP JSON-RPC transport (stdin/stdout)
  liteapi.mjs       — LiteAPI v3.0 HTTP client
  quality-score.mjs — Proprietary hotel quality scoring algorithm
  cug-framing.mjs   — CUG rate framing (savings vs OTA pricing)
  tracking.mjs      — PostHog event tracking (zero-dep, direct API)
  test.mjs          — Test harness
```

## CUG Rate Framing

Every rate response includes:
- `rate_type: "member_exclusive"` — identifies CUG pricing
- `cug_rate` — the member price (wholesale + 15% markup)
- `estimated_ota_rate` — what you'd typically pay on Booking.com/Expedia
- `savings_percentage` — how much cheaper the member rate is
- `framing_text` — human-readable string like "£230/night — 18% below typical OTA price"

## Quality Scores

Each hotel gets a proprietary 0-10 quality score based on:
- Star rating (base score)
- Guest review score (boost for 8.0+)
- Review volume (boost for 100+ reviews)
- Premium amenities (spa, pool, restaurant, etc.)

Labels: Exceptional (9+), Outstanding (8+), Very Good (7+), Good (6+), Average (5+)
