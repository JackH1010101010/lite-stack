# Autonomous Autoresearch Loop — Implementation Plan

*March 2026 · Lite-Stack · v6.2 (implementation complete through Phase 5)*

> **STATUS: PHASES 0–5 IMPLEMENTED. SYSTEM OPERATIONAL.**
> 19 scripts (7,440 lines), 8 registered workflows, 11 signal sources, 3 multi-agent decision perspectives. The autonomous loop runs end-to-end: measure → canary check → read signals → multi-agent consensus → workflow dispatch. All dry-runs pass. Ready for production deployment with API keys.

---

## Implementation Status (Updated 2026-03-13)

| Script | Status | Lines | Phase | Purpose |
|--------|--------|-------|-------|---------|
| orchestrate.js | ✅ Built | ~720 | 0 | The Brain — 4-phase loop, 11 signals, workflow dispatch |
| evolve.js | ✅ Built | ~400 | 0 | Copy A/B testing with quality gate (eval-variants) |
| seo-experiment.js | ✅ Built | ~260 | 4 | SEO title/meta A/B tests |
| seo-pages.js | ✅ Built | ~698 | 0 | City + region + amenity SEO page generator |
| hotel-add.js | ✅ Built | ~150 | 0 | Add hotels from hotel-refresh recommendations |
| city-add.js | ✅ Built | ~200 | 0 | Launch new city/destination |
| health-check.js | ✅ Built | ~120 | Pre | Daily site + API health pings |
| triage.js | ✅ Built | ~180 | Pre | Claude-powered issue analysis |
| weekly-digest.js | ✅ Built | ~350 | Pre | PostHog + GSC weekly summary + keyword gap analysis |
| reconcile.js | ✅ Built | ~200 | Pre | PostHog vs LiteAPI booking reconciliation |
| hotel-refresh.js | ✅ Built | ~180 | Pre | Monthly hotel inventory scan |
| explore.js | ✅ Built | ~200 | Pre | New city/niche opportunity scoring |
| rate-monitor.js | ✅ Built | ~260 | 5 | CUG vs retail margin monitoring |
| eval-variants.js | ✅ Built | ~280 | 5 | PromptFoo-style quality gate (brand rules + Jaccard) |
| content-audit.js | ✅ Built | ~260 | 5 | Pairwise page differentiation auditor |
| differentiation-injector.js | ✅ Built | ~340 | 5 | Unique data block generator (5 block types) |
| microfish-swarm.js | ✅ Built | ~280 | 5 | Batch differentiation fix across all pages |
| guide-builder.js | ✅ Built | ~250 | 5 | Data-driven comparison guide generator |
| workflow-runner.js | ✅ Built | ~220 | 5 | Composable multi-step workflow executor |

**Workflow Registry** (8 workflows in `workflows/registry.json`):
copy_test, seo_test, hotel_add, city_add, hotel_visibility, microfish, microfish_full, comparison_guide

**Signal Sources** (11 in orchestrate.js Phase C):
weekly_digest, hotel_refresh, explore, reconciliation, rate_monitor, rate_snapshot, content_audit, history, history_summary, strategy, ai_agent

**Content Assets** (6 comparison guides, 41 SEO pages across 3 sites):
- dubai-marina-vs-palm-jumeirah (84% unique)
- maldives-vs-seychelles-honeymoon (84% unique)
- maldives-water-villa-vs-beach-villa (84% unique)
- dubai-downtown-vs-jbr (85% unique) — NEW
- maldives-all-inclusive-vs-room-only (88% unique) — NEW
- bali-seminyak-vs-ubud (85% unique) — NEW

**Not Yet Built** (future enhancements):
- distribution-draft.js — auto-generate platform-specific content for consensus trigger
- serp-monitor.js — weekly SERP + AI Overview citation tracking
- strategy-update.js — monthly STRATEGY-PACK.md self-revision
- price-experiment.js — pricing A/B tests (needs template changes)
- google-hotels-feed.js — Google Hotels free listing integration

---

## Design Philosophy

> "Every single business can be connected at the most intricate level — this action to this action to this action, all the way through. It's getting granular. One word turns into six actions, and you just keep going until you can't reduce it anymore. Then that's what you automate." — Hormozi

This plan operates at two levels:
1. **Architecture level** — the system design, experiment types, approval gates, data flow
2. **Workflow level** — every atomic action within each pipeline, specified precisely enough that each maps to a few lines of code

The architecture tells you WHAT to build. The workflow decomposition tells you HOW to build it, step by step.

---

## The Problem

All 8 autoresearch scripts are wired up and running on cron. But the system is **reactive, not autonomous**. Scripts monitor and report — they create GitHub issues. Then a human reads the issue, decides what to do, and does it manually. The loop breaks at the "decide and act" step every time.

What we have is an alerting system. What we want is a self-improving system.

---

## Current State (What's Running — Updated March 2026)

| Script | Schedule | What it does | Loop closed? |
|--------|----------|-------------|--------------|
| health-check.js | Daily 08:00 UTC | Pings sites + LiteAPI, opens issue on failure | ✅ triage.js analyses |
| triage.js | On issue creation | Claude analyses issue, posts comment | ✅ orchestrate.js reads triage |
| weekly-digest.js | Sunday 03:00 UTC | PostHog funnels + GSC + keyword gap analysis | ✅ feeds orchestrator signals |
| reconcile.js | Sunday 03:00 UTC | PostHog vs LiteAPI booking reconciliation | ✅ feeds orchestrator signals |
| hotel-refresh.js | 1st of month | Finds new hotels in LiteAPI for existing cities | ✅ orchestrator dispatches hotel_add |
| explore.js | 1st of month | Scores new city/niche expansion opportunities | ✅ orchestrator dispatches city_add |
| seo-pages.js | Weekly + on push | Generates SEO landing pages | ✅ content-audit scores them |
| evolve.js | Via orchestrator | A/B tests copy variants via Claude + PostHog | ✅ eval-variants quality gate |
| orchestrate.js | Wednesday 05:00 UTC | The Brain — reads all signals, multi-agent consensus, dispatches workflows | ✅ THE LOOP CLOSER |
| rate-monitor.js | Weekly (configurable) | CUG vs retail margin monitoring | ✅ feeds orchestrator signals |
| content-audit.js | Via orchestrator | Pairwise page differentiation scoring | ✅ triggers microfish workflow |
| microfish-swarm.js | Via workflow runner | Batch differentiation fix | ✅ re-audits after injection |
| guide-builder.js | Via workflow runner | Comparison guide generation | ✅ highest-differentiation content |
| workflow-runner.js | Called by orchestrator | Multi-step pipeline executor | ✅ composable workflow dispatch |

**The loop is now closed.** orchestrate.js reads 11 signal sources, runs 3-perspective multi-agent consensus, and dispatches through the workflow registry. No human in the loop for standard operations.

---

## Key Architectural Constraint: The LuxStay Submodule

LuxStay (`luxstay/index.html`) is a separate git repo (JackH1010101010/luxstay) with `skip_deploy: true` in the generator config. It's hand-coded (1,113 lines) and deployed via its own Netlify setup, not via `deploy-all.js`.

The generator template (`template.html`) produces all three sites (luxstay, dubai-ultra, maldives-escape) but luxstay has `skip_deploy: true` so it's deployed separately.

**This means:** evolve.js copy tests work for dubai-ultra and maldives-escape (they use the generator config → template pipeline). LuxStay copy changes require editing `luxstay/index.html` directly and pushing to a different repo. The orchestrator needs to handle this split:

- **Template-based sites** (dubai-ultra, maldives-escape): evolve.js modifies the config JSON, regenerates, deploys → standard pipeline.
- **LuxStay**: evolve.js would need to either (a) migrate luxstay to the generator pipeline (best long-term), or (b) have a separate code path that patches `luxstay/index.html` directly (fragile). **Recommendation: Phases 0-2 operate on template-based sites only. Migrate luxstay to the generator in Phase 3 (Week 6-8) — this is now CRITICAL since LuxStay is the designated authority hub.**

---

## PostHog Events Available

These are the measurable signals the system can use:

| Event | Tracked in | Useful for |
|-------|-----------|------------|
| `page_view` / `$pageview` | Both (template fires `page_view`, PostHog auto-captures `$pageview`; weekly-digest.js queries `$pageview`) | Traffic measurement |
| `hotel_search` | Both | Engagement — user searched |
| `hotel_viewed` | Template only | Card click-through (luxstay doesn't track this) |
| `booking_started` | Both | Booking funnel entry |
| `booking_completed` | Both | Revenue measurement |
| `member_joined` | Both | Conversion — the key CUG metric |
| `cookie_consent_accepted` | Both | Consent rate |

**Note:** Template-based sites track `hotel_viewed` but luxstay doesn't. This is another reason to migrate luxstay to the generator.

**New events added by this plan (not yet implemented):**

| Event | Added in | Useful for |
|-------|----------|------------|
| `ai_agent_search` | Phase 0 | AI agent engagement — user searched via MCP agent |
| `ai_agent_hotel_viewed` | Phase 0 | AI agent funnel — hotel details requested |
| `ai_agent_booking_started` | Phase 0 | AI agent conversion — booking initiated |
| `ai_agent_booking_completed` | Phase 0 | AI agent revenue — booking confirmed |
| `rate_revealed` | Phase 0.5 | CUG gate effectiveness — signed-in user sees member rate |
| `price_comparison_viewed` | Phase 0.5 | Value prop impact — "save X% vs Booking.com" shown |
| `editorial_cta_clicked` | Phase 0.5 | Content → commerce bridge — editorial page to hotel card |
| `google_hotels_click` | Phase 0.5 | Google Hotels channel attribution — user arrived from Hotel Pack |

---

## The Vision

Drawing from three models discussed in the transcript research:

### Karpathy's Autoresearch (Polymarket Bot)
Tight autonomous loop: generate hypothesis → deploy variant → measure outcome → keep winner → feed results into next iteration. Git history IS institutional memory. Agent has full access to all previous results. **Key adaptation:** Karpathy's bot cycles every 5 minutes because trades resolve fast. Hotel experiments need days/weeks. Our cycle time is weekly (orchestrator) with measurement windows of 7-28 days depending on experiment type.

### Stephen Pope's Self-Improving Agent (thepopebot)
Agent identifies capability gaps → builds its own skills → delivers output → human approval gate. The key insight: the agent improves its OWN tooling, not just the product. Skills compound. **Applied here in two ways:** (1) Human approval gates for high-risk actions (new hotels, new cities). (2) Long-term: the orchestrator could identify new experiment types to build (Phase 5 — not in this plan).

### MiroFish Multi-Agent Swarm
Multi-agent swarm intelligence for prediction/scoring. Multiple agents independently evaluate the same decision, consensus reduces noise. **Applied here:** The orchestrator runs 3 parallel Claude calls with different strategic lenses (growth, revenue, SEO) to avoid single-perspective bias when choosing what to experiment on.

### Meta-Cognition Assessment (v6)

The system has three layers of self-awareness:

1. **Experiment memory** (history.json → history-summary.json → Claude prompt). The system digests its own results into "lessons learned" and avoids repeating failures.
2. **Strategic reasoning** (STRATEGY-PACK.md machine JSON → orchestrator context). The system reads its own strategic priorities when deciding what to do next.
3. **Strategy self-correction** (strategy-update.js). The strategy document itself evolves monthly based on fresh market signals, SERP checks, and AI citation monitoring.

**Meta-cognition status (updated March 2026):**
- **Capability gap detection:** ✅ SOLVED. The workflow registry + `proposeWorkflow()` lets the orchestrator suggest new workflow types as GitHub issues. Human approves, adds to registry, orchestrator uses it next cycle. The "fixed menu" is now a dynamic registry.
- **Prediction accuracy tracking:** ✅ PARTIALLY SOLVED. Every decision in history.json now includes a `prediction` field with `expected_outcome` and `check_after` date. Measurement happens in Phase A. Full closed-loop scoring not yet automated.
- **Confidence scoring on decisions:** ✅ SOLVED. Signal coverage is counted (`signal_count/signal_total`), included in every Claude prompt, and logged with every decision. Low-confidence warnings trigger conservative fallback choices.
- **Trend velocity detection:** ⏳ NOT YET BUILT. Requires serp-monitor.js and/or Google Trends API integration. Listed as future enhancement.

---

## Architecture: The Autonomous Loop

```
┌──────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                             │
│                autoresearch/orchestrate.js                     │
│                                                               │
│  Runs weekly (Wednesday, after Sunday digest + triage).       │
│                                                               │
│  STEP 1: Check for pending experiments past measurement       │
│          window → measure → promote winner → log to history   │
│                                                               │
│  STEP 2: Read all signals (via triage comments, not raw):     │
│   - Triage comment on latest digest (Claude's analysis)       │
│   - Triage comment on latest hotel-refresh issue              │
│   - Triage comment on latest explore issue                    │
│   - Triage comment on latest reconciliation issue             │
│   - history.json (what we've tried, what worked)              │
│   - history-summary.json (lessons learned, if >50 entries)    │
│   - STRATEGY-PACK.md machine JSON (priorities, benchmarks)    │
│   - AI agent + Google Hotels channel metrics from PostHog     │
│                                                               │
│  STEP 3: Call Claude to decide what to test next.             │
│   - Only picks from template-based sites (not luxstay)        │
│   - Skips if an experiment is still in measurement window     │
│   - Avoids repeating failed experiment patterns               │
│                                                               │
│  STEP 4: Dispatch to the right executor.                      │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXPERIMENT TYPES                            │
│                                                               │
│  1. COPY TEST (evolve.js)                                     │
│     - Headlines, CTAs, modal text, FAQs                       │
│     - Deploy 3 variants to separate Netlify sites             │
│     - Each variant = full Netlify site at <name>-v1.netlify   │
│     - Measure: member_joined conversions via PostHog           │
│     - Window: 7 days (need traffic across a full week)        │
│                                                               │
│  2. SEO TEST (seo-experiment.js) ← NEW                        │
│     - Title tags, meta descriptions on SEO landing pages      │
│     - Deploy variant pages to same site (different URLs)      │
│     - Measure: impressions + CTR via GSC API                  │
│     - Window: 21 days (GSC data lags 2-3 days + needs volume) │
│                                                               │
│  3. NEW HOTEL ADDITION (hotel-add.js) ← NEW                   │
│     - Takes hotel-refresh findings, adds to config            │
│     - Regenerates + deploys                                   │
│     - Gated: creates draft PR, human merges                   │
│     - Measure: hotel_viewed + booking_started for new hotel   │
│     - Window: 14 days                                         │
│                                                               │
│  4. NEW CITY/NICHE (city-add.js) ← NEW                        │
│     - Takes explore.js top opportunity + LiteAPI hotel IDs    │
│     - Creates new config JSON via Claude (copy + hotel list)  │
│     - Deploys to a new Netlify site                           │
│     - Gated: creates PR, human reviews before merge           │
│     - Measure: organic traffic + member_joined after launch   │
│     - Window: 28 days                                         │
│                                                               │
│  5. PRICING FRAME TEST (price-experiment.js) ← NEW (Phase 4)  │
│     - How the price card displays (anchoring, urgency, badge) │
│     - Requires: config-driven variant rendering in template   │
│     - Measure: booking_started rate via PostHog               │
│     - Window: 7 days                                          │
│     - NOTE: Bigger lift than copy — needs template changes    │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                   EXPERIMENT MEMORY                            │
│                autoresearch/history.json                       │
│                                                               │
│  Append-only log of every experiment:                         │
│  {                                                            │
│    "id": "exp-2026-03-15-copy-maldives",                      │
│    "type": "copy_test",                                       │
│    "site": "maldives-escape",                                 │
│    "hypothesis": "Urgency-framed headline converts better",   │
│    "variants": [                                              │
│      { "label": "control", "url": "...", "conversions": 12 },│
│      { "label": "v1", "url": "...", "conversions": 8 },      │
│      { "label": "v2", "url": "...", "conversions": 18 }      │
│    ],                                                         │
│    "started": "2026-03-15T05:00:00Z",                         │
│    "measure_after": "2026-03-22T05:00:00Z",                   │
│    "measured": "2026-03-22T05:12:00Z",                        │
│    "winner": "v2",                                            │
│    "lift": "+50% member_joined (18 vs 12)",                   │
│    "statistically_significant": false,                        │
│    "promoted": true,                                          │
│    "commit": "abc123",                                        │
│    "notes": "Low sample size — monitor next week"             │
│  }                                                            │
│                                                               │
│  Three entry types:                                          │
│   - "experiment" — A/B test result (copy, SEO, pricing)      │
│   - "decision"   — What the orchestrator chose and why       │
│   - "observation" — Patterns noticed but not acted on         │
│     (e.g., "3 consecutive no-lift on maldives copy tests")   │
│                                                               │
│  Claude reads this history when deciding what to test next.   │
│  Feed: last 10 raw entries + history-summary.json (generated │
│  by orchestrator when history exceeds 50 entries — a Claude  │
│  "lessons learned" digest that prevents unbounded prompts).  │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

> **STRATEGIC REALIGNMENT (v6):** The v5 plan tried to optimise sites with no traffic — running A/B tests on pages nobody visits. Research in STRATEGY-PACK.md v5.0 identified that traffic-generating channels must come FIRST. The restructured phases front-load revenue-generating activities: AI Agent (1-2 weeks to first booking potential), Google Hotels free booking links (3-9 weeks), and comparison editorial content (3-6 months to indexing). The autonomous optimisation loop (evolve.js, orchestrate.js) now comes AFTER these channels are producing traffic to optimise against.

### Phase 0: AI Agent MVP (Week 1-2) ← NEW

**Goal:** Build and deploy a Lite-Stack AI booking agent using LiteAPI's existing MCP server. This is the fastest path to first revenue — no SEO wait, no paid ads needed.

**Context:** LiteAPI has shipped an open-source MCP server (github.com/liteapi-travel/mcp-server) with 5 tools: getHotels, getHotelDetails, getRates, preBook, book. AI-referred bookings convert at 15.9% vs 1.76% for Google organic (9x). See STRATEGY-PACK.md Section 18.

**Tasks:**

0a. **Fork LiteAPI MCP server**
   - Clone github.com/liteapi-travel/mcp-server
   - Review the 5 MCP tool definitions (getHotels, getHotelDetails, getRates, preBook, book)
   - Understand the schema optimisation for LLM consumption
   - Test locally against LiteAPI sandbox key (already in `.env` as `LITEAPI_SANDBOX_PUBLIC_KEY`)

0b. **Add Lite-Stack CUG rate framing**
   - When `getRates` returns results, enhance the response with:
     - CUG discount percentage vs. rack rate (data available from LiteAPI SSP comparison)
     - Framing text: "£X/night — Y% below typical OTA price"
   - This is the unique value proposition — no other MCP agent offers wholesale rates

0c. **Add quality score injection**
   - When `getHotelDetails` returns, inject Lite-Stack's proprietary quality scores
   - Source: computed from LiteAPI data (rating, review count, amenities, location)
   - Present as "Lite-Stack Quality Score: 8.7/10" alongside standard hotel data
   - This creates the "data-driven authority" E-E-A-T signal even in AI agent context

0d. **Add booking attribution**
   - Route all `preBook` and `book` calls through Lite-Stack's existing Netlify functions (`/netlify/functions/liteapi`)
   - This ensures every AI-agent booking is tracked in PostHog and attributed to the AI channel
   - Add PostHog event: `ai_agent_booking_started` and `ai_agent_booking_completed`

0e. **Deploy as Claude Desktop / ChatGPT-compatible agent**
   - Package as an MCP server that can be added to Claude Desktop configuration
   - Create a simple README with installation instructions
   - Test end-to-end: user asks "find me a luxury hotel in Dubai Marina under £400/night" → agent searches → shows CUG rates → books
   - **Initial distribution:** Share MCP config with early testers. No app store listing needed yet.

0f. **Add AI referral tracking to PostHog**
   - New events: `ai_agent_search`, `ai_agent_hotel_viewed`, `ai_agent_booking_started`, `ai_agent_booking_completed`
   - Track conversion funnel separately from web traffic
   - Benchmark against the 15.9% industry AI conversion rate

0f-ii. **Investigate Perplexity Selfbook integration (parallel)**
   - Perplexity already has 140,000 bookable hotels via Selfbook API + TripAdvisor content
   - Question: Can LiteAPI inventory be fed into Selfbook's network? (Open Question Q11/Q16 in Strategy Pack)
   - If yes: Lite-Stack hotels appear in Perplexity search results with direct booking capability
   - Action: Email LiteAPI and Selfbook (docs.selfbook.com) to inquire about integration path
   - This is a zero-engineering distribution channel if it works — just a business development inquiry

### Phase 0.5: Technical Quick Fixes + Google Hotels + Sign-In Gate UX (Week 2-4) ← NEW

**Goal:** Fix the low-effort technical gaps identified in the audit (Section 19), start the Google Hotels integration process, and implement the correct sign-in gate UX. All run in parallel.

**Critical UX Decision (from Strategy Pack):** Only gate **rates and booking**, NOT content. Comparison guides, editorial content, and hotel information must be freely accessible for SEO indexing and AI citation. The sign-in gate appears only when a user wants to see the member rate or initiate a booking. This maximises organic reach while preserving the exclusivity perception. See Strategy Pack machine_strategy JSON: `sign_in_gate: rate_and_booking_only_not_content`.

**Track A — Technical Fixes (Week 2, 1-2 days):**

0g. **Add image width/height attributes to template**
   - In `generator/template.html`, add explicit `width` and `height` to all `<img>` tags
   - Prevents CLS (Cumulative Layout Shift) — the main CWV gap identified
   - Also add `decoding="async"` to improve rendering performance

0h. **Add og:image, Twitter Card, and dns-prefetch**
   - Add `<meta property="og:image">` with a branded social preview image per site
   - Add Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
   - Add `<link rel="dns-prefetch">` for LiteAPI, PostHog, and Google APIs
   - Total: ~15 lines of HTML added to template

0i. **Add Hotel and Offer schema to main pages**
   - Currently only SEO sub-pages have ItemList/Hotel schema
   - Add Hotel schema with Offer (price range) to main `index.html` for each site
   - This enables rich snippets in Google and improves AI citation eligibility
   - Implement via template — inject from config data at build time

0j. **Add 3 missing PostHog events**
   - `rate_revealed` — fires when signed-in user sees CUG rate
   - `price_comparison_viewed` — fires when "save X% vs Booking.com" comparison displays
   - `editorial_cta_clicked` — fires on editorial-to-hotel navigation
   - Identified in STRATEGY-PACK.md Section 14

**Track B — Google Hotels Free Booking Links (Week 2-4, parallel):**

0k. **Contact Channex.io**
   - Channex.io is the recommended Google Hotels connectivity partner (developer-friendly API, documented Google integration)
   - Inquire about: (a) feeding external rate sources (LiteAPI) into Channex, (b) Google Hotels integration timeline, (c) pricing/terms
   - Fallback: SiteMinder (more enterprise, less developer-friendly)

0l. **Set up Google Hotel Center account**
   - Required regardless of connectivity partner
   - Step 1 of Google's 6-step onboarding: fill interest form
   - Step 2: sign Content Licensing Agreement
   - Can start before Channex integration is confirmed

0m. **Build rate feed pipeline**
   - Once Channex confirms integration path:
   - Build script to fetch LiteAPI rates → format for Channex API → push daily
   - Use ARI (Availability, Rates, Inventory) format if Channex supports it
   - Ensure price accuracy between feed and landing page (Google certification requirement)

### Phase 1: Comparison Editorial Content (Week 2-6) ← REPRIORITISED

**Goal:** Produce the 10 target comparison guides identified as the #1 SEO opportunity. These serve both Google organic SEO and AI citation strategy simultaneously.

**Context:** Live SERP analysis (STRATEGY-PACK.md Sections 11, 20) confirmed comparison queries are dominated by Facebook groups and forum posts. TravelTime World (a tiny blog) ranks position 3 for "Dubai Marina vs Palm Jumeirah." The content quality gap is enormous. See Section 17 for the target keyword list and "Hotel Decision Guide" template.

**Content Quality Rules (from Strategy Pack — non-negotiable):**
- **40% Rule:** Every page must have ≥40% unique data not available on competitor sites. This means LiteAPI quality scores, price positioning analysis, availability patterns, computed neighbourhood context — not just hotel descriptions rewritten from OTA listings. Google's December 2025 update penalised sites lacking differentiation by -93%.
- **800+ words per page minimum** with ≥3 unique data points and ≥3 internal links
- **E-E-A-T positioning: data-driven authority, NOT fake experience.** Don't imply personal hotel stays. Instead: "We analysed 2,800 guest reviews across 50 Dubai Marina hotels" — this is aggregate review synthesis (legitimate meta-analysis). Transparency about the methodology is the trust signal.
- **Answer-first format for AI citation:** First 200 words must directly answer the primary query before elaborating. This is the AI citation extraction target.
- **Schema on every page:** FAQPage, Hotel, Offer, BreadcrumbList, ItemList required for both Google rich snippets and AI citation eligibility

**Tasks:**

1a. **Build the "Hotel Decision Guide" content template**
   - Standardised structure for comparison editorial content:
     1. Opening summary (first 200 words — AI citation target)
     2. Side-by-side comparison table (LiteAPI data — quality scores, price ranges)
     3. Neighbourhood context (walkability, transport, dining)
     4. Price positioning analysis (CUG vs rack rate, seasonal variation)
     5. Verdict with nuance ("Choose X if... Choose Y if...")
     6. CTA: "See member rates for [hotel]" (gated, requires sign-in)
   - Build as an HTML template in the generator (new page type alongside city/region/amenity pages)
   - Include schema markup: FAQPage, ItemList, BreadcrumbList

1b. **Generate first 3 comparison guides** (highest priority keywords)
   - Dubai Marina vs Palm Jumeirah luxury hotels (est. 1,200-2,400 monthly searches, LOW competition)
   - Maldives water villa vs beach villa (est. 2,400-4,800 monthly searches, LOW-MEDIUM competition)
   - Maldives vs Seychelles luxury honeymoon (est. 2,400-4,800 monthly searches, LOW-MEDIUM competition)
   - Each guide uses LiteAPI data for: hotel quality scores, price ranges, availability patterns
   - AI-generated with Claude + LiteAPI data, human-reviewed for quality
   - Deploy to LuxStay (authority hub — see Q1 resolution in STRATEGY-PACK.md Section 21)

1c. **Generate next 7 comparison guides** (medium-priority keywords)
   - Santorini Oia vs Fira hotels
   - Bali Seminyak vs Ubud luxury
   - Paris Left Bank vs Right Bank luxury hotels
   - London Mayfair vs Knightsbridge hotels
   - Amalfi Coast vs Cinque Terre luxury stays
   - Tokyo Shinjuku vs Shibuya luxury hotels
   - Swiss Alps Zermatt vs St Moritz
   - Production rate: 2-3 guides per week → all 10 shipped within 4-5 weeks

1d. **Build "consensus trigger" content distribution**
   - For each published guide, share key findings on 3+ platforms:
     - Reddit (r/travel, r/luxurytravel, r/dubai, destination-specific subs)
     - Relevant travel forums (TripAdvisor, Lonely Planet Thorn Tree)
     - If possible: travel newsletters, YouTube creators
   - This creates the "consensus signal" that triggers AI model citation (STRATEGY-PACK.md Section 15)
   - Don't spam — share genuine data insights (e.g., "We analysed 50 Dubai Marina hotels and found...")

1e. **Add member-rate explainer content**
   - "How luxury hotel member rates actually work (and how much you really save)" — evergreen explainer
   - "CUG hotel rates explained: the wholesale pricing model" — educational
   - "We compared member rates vs Booking.com on 100 hotels" — proprietary data piece
   - These target the undercontested "member rates" keyword cluster (STRATEGY-PACK.md Section 17)

### Phase 2: Wire Up evolve.js + Measurement (Week 4-6) ← WAS PHASE 1

**Goal:** Make the existing copy A/B testing fully autonomous on template-based sites. NOW this phase has traffic from Google Hotels + AI agent to test against.

**Strategic context change:** With Google Hotels potentially driving booking-intent traffic and AI agent bookings flowing in, there's now meaningful data for the optimisation loop. Previously this phase was blocked by the low-traffic problem.

**Tasks:**

1. **Create `history.json`** — empty array `[]` to start. This is the foundation everything depends on.

2. **Modify `evolve.js`**
   - **Already has:** `--site` and `--variants` CLI args, Claude Haiku model, variant generation + Netlify deployment pipeline
   - **Restructure experiments.json as an array** — current code writes a single object `{ base_site, started_at, variants }`. Needs to be `[{ site, status, ... }, ...]` to support parallel experiments on different sites. Read → find existing entry for this site → update in place or append.
   - Add `measure_after` timestamp to experiment entry when generating variants
   - Add `status` field: `running` | `measuring` | `canary` | `promoted` | `canary_failed` | `complete`
   - Add `hypothesis` field (Claude's rationale for the variant angles)
   - **Add history.json integration:** After measurement, append result to `history.json`. When generating new variants, include last 10 history entries in the Claude prompt so it avoids repeating failed angles.
   - Change measurement window from 48-72h (current) to **7 days** (need a full week of traffic for meaningful data — sites are low-traffic currently)
   - **Prerequisite:** Traffic-splitting mechanism must exist (see "Traffic Splitting" section) — without it, variant sites get zero visitors and measurement returns noise

3. **Add `orchestrate.yml`** workflow
   - Cron: Wednesday 05:00 UTC (2 days after Sunday digest, giving time for triage)
   - Permissions: `contents: write`, `actions: write` (allows triggering deploy)
   - Step 1: Check experiments.json for pending measurement → if due, measure → mark winner as `canary`
   - Step 2: Check for canary experiments past 7-day canary window → if still positive, promote to base config + commit
   - Step 3: If no active experiment, run evolve.js on a randomly chosen template-based site (dubai-ultra or maldives-escape — NOT luxstay)
   - Auto-commit promoted configs + push
   - **IMPORTANT: `github.token` pushes do NOT trigger `on: push` workflows** (GitHub anti-recursion protection). After pushing, orchestrate.yml must explicitly trigger deploy.yml via `gh workflow run deploy.yml` (requires `actions: write` permission). Alternatively, use `workflow_dispatch` event on deploy.yml and trigger it via the GitHub API.

4. **Add Netlify cleanup step** to orchestrate.yml
   - After promoting a winner, delete the variant Netlify sites (`<site>-v1`, `-v2`, `-v3`)
   - Prevents orphaned Netlify sites accumulating over time

5. **Add statistical significance flag** to measurement
   - With low traffic, most early experiments won't be significant
   - Log `statistically_significant: false` but still promote if directionally positive
   - Add `sample_size` field so the orchestrator can learn "we need more traffic before copy tests are meaningful"

6. **Add machine-readable JSON blocks to all issue-creating scripts**
   - hotel-refresh.js, explore.js, reconcile.js, weekly-digest.js
   - Each issue body starts with `<!-- machine: {...} -->` containing structured data
   - Enables fast rule-based pre-filtering by the orchestrator and future dashboarding
   - Human-readable markdown follows unchanged

### Phase 3: Orchestrator Brain + SEO Experiments (Week 6-8) ← WAS PHASE 2

**Goal:** Replace the random site selection with intelligent decision-making. Add SEO testing. Now the orchestrator also reads AI agent + Google Hotels signals.

**Tasks:**

7. **Build `orchestrate.js`** (the brain)
   - Reads ALL signals via triage comments (never raw issue bodies):
     - Triage comment on latest weekly-digest
     - Triage comment on latest hotel-refresh issue
     - Triage comment on latest explore issue
     - Triage comment on latest reconciliation issue
   - **NEW:** Also reads AI agent booking data from PostHog (`ai_agent_booking_completed` events)
   - **NEW:** Also reads Google Hotels impression/click data (from Hotel Center or Channex reporting)
   - Also reads: history.json (last 10 raw entries) + history-summary.json (if exists)
   - Also reads: machine-readable JSON blocks from issues for fast pre-filtering
   - **NEW:** Also reads STRATEGY-PACK.md machine-readable JSON blocks for strategic guidance
   - Calls Claude (Haiku) with all context + decision menu
   - **Key design:** Layered intelligence — each layer adds analysis without re-doing prior work. Triage improves → orchestrator automatically benefits.
   - Dispatches to the right executor via `child_process.execSync`
   - Logs three entry types to history.json: `decision` (what it chose), `observation` (patterns noticed), `experiment` (after measurement)
   - When history.json exceeds 50 entries: generates history-summary.json via Claude (a "lessons learned" digest) to prevent unbounded prompt growth

8. **Build `seo-experiment.js`**
   - **First step: regenerate SEO pages** — SEO pages are generated by seo-pages.js but never committed to git. seo-experiment.js must call `node autoresearch/seo-pages.js --site <site>` first to create the files on disk before it can read/modify them.
   - Takes a site + existing SEO page (e.g., `dubai-ultra/dubai-marina-rooftop-hotels.html`)
   - Generates 3 variant title tags + meta descriptions via Claude
   - Deploys as separate URLs on the same Netlify site (e.g., `dubai-marina-rooftop-v1.html`)
   - Links variants from a hidden test index page (or uses query params)
   - Measures: GSC impressions + CTR after **21 days** (GSC data lags 2-3 days, then needs 2+ weeks of indexing and impression data)
   - Promotes winner by updating the SEO page's `<title>` and `<meta description>`
   - **Prerequisite:** GSC service account must be configured (env var `GOOGLE_SERVICE_ACCOUNT_JSON`)

9. **Migrate luxstay to the generator** (NOW CRITICAL — not optional)
   - LuxStay is the designated authority hub (Q1 resolution). All editorial content, AI citation strategy, and Google Hotels traffic flows here.
   - Create a proper `luxstay.json` config with `skip_deploy: false`
   - Port the luxstay-specific differences (hardcoded colours, extra CSS for `.perk-icon`/`.btn-join-modal`, non-templated metadata) into the template via conditional blocks. The diff is moderate — luxstay is 1,113 lines, mostly matching the template but with hardcoded values where template uses `{{variables}}`.
   - This unblocks evolve.js copy tests on luxstay and integrates it into the autonomous loop
   - **Must be done by Phase 3** — the authority hub cannot be outside the autonomous system

### Phase 4: Auto-Acting on Findings (Week 8-10) ← WAS PHASE 3

**Goal:** Close the loop on hotel-refresh and explore — don't just report, act.

**Tasks:**

10. **Build `hotel-add.js`**
   - Reads latest hotel-refresh GitHub issue (parses the markdown table of suggested hotels)
   - Filters for hotels meeting quality thresholds (already scored in hotel-refresh.js: stars ≥4, rating ≥7.5, reviews ≥100)
   - Adds them to the relevant site config JSON
   - **Does NOT auto-deploy.** Creates a draft GitHub PR with the config change. Human reviews and merges. This is the approval gate.
   - After merge → deploy.yml fires → site rebuilds with new hotels

11. **Build `city-add.js`**
    - Reads latest explore.js opportunity report (parses the ranked city list)
    - Takes the #1 ranked city
    - **Pulls hotel IDs from the explore.js report** (explore.js already queries LiteAPI for available hotels in candidate cities — those IDs need to be included in the issue body)
    - Clones an existing config (e.g., dubai-ultra.json) as a template
    - Calls Claude to generate city-specific copy (hero, editorial, FAQs, trust items)
    - Creates draft PR. Human reviews — checks hotel selection, copy quality, branding.
    - After merge → deploy-all.js creates Netlify site + deploys

12. **Build `price-experiment.js`** (deferred — bigger lift, bigger effort)
    - Tests how price cards render: show/hide retail strikethrough, badge text ("X% off" vs "Member exclusive"), urgency cues
    - **Requires template changes:** Add a `price_card_variant` field to configs that the template reads. Template renders differently based on variant value.
    - Measures: `booking_started` conversion rate via PostHog
    - Window: 7 days
    - **This is the highest-value experiment type** (directly affects booking conversion) but needs the most engineering work. Build after copy + SEO tests prove the pipeline works.

### Phase 5: Multi-Agent Scoring + Competitive Intelligence + i18n (Week 10+) ← WAS PHASE 4

**Goal:** Better decisions through parallel evaluation, richer signals, and non-English market entry.

**Tasks:**

13. **Multi-agent orchestrator upgrade**
    - Instead of one Claude call deciding what to test, run 3 parallel calls:
      - "Growth agent" — optimises for member signups, asks "what's blocking conversion?"
      - "Revenue agent" — optimises for booking value, asks "what's the highest-margin opportunity?"
      - "SEO agent" — optimises for organic traffic, asks "where are we leaving impressions on the table?"
    - Each scores the same experiment options 1-10
    - Orchestrator picks the consensus or highest-urgency recommendation
    - All 3 perspectives logged to history for learning

14. **Competitive rate monitoring** (`rate-monitor.js`) — new script
    - Weekly: for each hotel in configs, fetch LiteAPI rates (with and without margin)
    - Compare SSP (retail) vs member price → actual margin percentage
    - Flag hotels where margin < MIN_SAVING (8%) — hide or de-prioritise
    - Flag hotels where margin > 25% — feature more prominently
    - Feed into orchestrator as signal: "inventory X has great margins right now"

15. **GSC keyword gap analysis** (enhance weekly-digest.js or new script)
    - Pull GSC queries across all sites
    - Identify high-impression, low-CTR queries → title tag experiment candidates
    - Identify queries with impressions but no landing page → auto-generate via seo-pages.js
    - Feed into orchestrator as SEO experiment candidates

16. **PromptFoo eval integration** (quality gate)
    - Use PromptFoo (promptfoo.dev) to evaluate Claude's copy generation quality
    - Run evals before deploying variants: reject variants that are too similar, off-brand, or factually wrong
    - Prevents the system from deploying bad experiments

17. **German market entry (Phase 1 of non-English strategy)** ← NEW
    - Add hreflang tag support to the generator template
    - Implement subdirectory URL structure (domain.com/de/)
    - Translate top 3 comparison guides to German (native writer review mandatory)
    - Add EUR currency support alongside GBP
    - Target Google.de for long-tail luxury hotel comparison queries (60-80% less competition than English equivalents)
    - See STRATEGY-PACK.md Section 16 for full implementation plan

18. **AI agent enhancement** ← NEW
    - Based on Phase 0 learnings, enhance the MCP agent:
      - Add comparison data from editorial content to agent responses
      - Investigate Perplexity Selfbook integration for wider distribution
      - Build a web-based chat interface on LuxStay for visitors who prefer AI-assisted search
    - Monitor ChatGPT plugin ecosystem for opportunities

---

## Workflow Architecture (Target State)

```
PHASE 0 TRACK (Week 1-2) — AI AGENT
  └── Manual build: fork LiteAPI MCP server
        → Add CUG rate framing (wholesale price + % savings)
        → Add quality score injection (Lite-Stack proprietary scores)
        → Route bookings through Netlify functions (PostHog attribution)
        → Deploy as Claude Desktop / ChatGPT-compatible MCP agent
        → New PostHog events: ai_agent_search, ai_agent_booking_*

PHASE 0.5 TRACK A (Week 2) — TECHNICAL FIXES
  └── Manual build: template + schema improvements
        → Add img width/height + decoding="async" to template
        → Add og:image, Twitter Card, dns-prefetch tags
        → Add Hotel/Offer schema to main index pages
        → Add 3 PostHog events: rate_revealed, price_comparison_viewed,
          editorial_cta_clicked

PHASE 0.5 TRACK B (Week 2-4) — GOOGLE HOTELS
  └── Manual process: connectivity partner + Hotel Center
        → Contact Channex.io (approved Google connectivity partner)
        → Set up Google Hotel Center account (interest form + CLA)
        → Build rate feed: LiteAPI → Channex API → Google Hotels
        → Ensure price accuracy between feed and landing pages

PHASE 1 TRACK (Week 2-6) — EDITORIAL CONTENT
  └── Manual + semi-automated: comparison guides
        → Build "Hotel Decision Guide" HTML template in generator
        → Generate 10 comparison guides with LiteAPI data + Claude
        → Deploy to LuxStay (authority hub)
        → Distribute key findings on Reddit, forums (consensus trigger)
        → Add member-rate explainer content

DAILY
  └── health-check.yml → health-check.js
        → Opens issue on failure
        → triage.js auto-comments on the issue

WEEKLY (Sunday 03:00 UTC)
  └── deploy.yml
        → seo-pages.js (regenerate all SEO pages)
        → deploy-all.js (rebuild + deploy dubai-ultra, maldives-escape)
        → luxstay SEO pages deployed separately (Netlify site ID hardcoded)
        → weekly-digest.js (PostHog funnels + GSC → creates issue)
        → reconcile.js (booking reconciliation → creates issue if anomalies)
        → triage.js fires automatically on new digest/reconcile issues

WEEKLY (Wednesday 05:00 UTC) — ORCHESTRATOR (Phase 2+)
  └── orchestrate.yml → orchestrate.js
        1. Measure any pending experiments past their window → mark winner as canary
        2. Check canary experiments past 7-day canary window → promote if holds
        3. Promote winners → commit + push → trigger deploy via workflow_dispatch
        4. Clean up variant Netlify sites (only after promotion, not during canary)
        5. Read signals:
           - Triage comments on digest/refresh/explore/reconcile issues
           - Machine-readable JSON blocks from issue bodies
           - history.json + history-summary.json
           - AI agent booking data from PostHog (ai_agent_booking_completed)
           - Google Hotels impression/click data (Hotel Center / Channex)
           - STRATEGY-PACK.md machine-readable JSON blocks
        6. Decide next experiment via Claude (respects diversity scheduling)
        7. Dispatch: evolve.js | seo-experiment.js | hotel-add.js | city-add.js | skip
        8. Log decision + observations to history.json
        9. If history >50 entries, regenerate history-summary.json

MONTHLY (1st at 04:00 UTC)
  └── deploy.yml (monthly job)
        → hotel-refresh.js (find new hotels → creates issue)
        → explore.js (score new cities → creates issue)
        → triage.js fires on both issues
        → [orchestrator picks up findings on next Wednesday]

MONTHLY (2nd at 06:00 UTC) — STRATEGY AUTO-UPDATE (Phase 3+)
  └── orchestrate.yml (monthly strategy step)
        → strategy-update.js
        1. Gather internal signals (history.json, PostHog, digest trends)
        2. Run SERP checks on 5 core queries (compare vs previous snapshot)
        3. Check AI citation status (ChatGPT, Perplexity, Gemini)
        4. Claude analyses: stale data, new opportunities, risk changes
        5. Auto-apply low-risk updates (stale numbers, risk severity)
        6. Gate high-risk changes (strategy shifts, new priorities) → GitHub issue
        7. Monthly competitive scan (Secret Escapes, Voyage Privé, etc.)
        8. Update STRATEGY-PACK.md machine-readable JSON blocks
        → Orchestrator reads updated strategy context on next Wednesday

ON ISSUE CREATION
  └── triage.yml → triage.js
        → Claude analyses + comments
        → Auto-closes healthy digests/reconciliations
```

---

## Workflow Decomposition (Atomic Actions)

Every workflow below is broken down to its irreducible actions — the level where each step maps to a few lines of code. This is the implementation spec.

### Workflow 1: Weekly Orchestration Cycle (`orchestrate.js`)

```
TRIGGER: orchestrate.yml cron — Wednesday 05:00 UTC

── PHASE A: MEASURE PENDING EXPERIMENTS ──────────────────────

 1. Read experiments.json from disk
 2. Filter entries where status === "running" AND measure_after < now
 3. FOR EACH pending experiment:
    a. Read variant URLs from experiment entry
    b. FOR EACH variant URL:
       i.   Call PostHog events API: GET /api/projects/@current/events/
            ?event=member_joined
            &properties=[{"key":"$current_url","value":"<variant_url>","operator":"icontains"}]
            &after=<experiment.started_at>
       ii.  Parse response → count conversions
       iii. Call PostHog events API for $pageview with same URL filter → count visitors
       iv.  Calculate conversion rate: conversions / visitors
       v.   Store: { variant, conversions, visitors, rate }
    c. Calculate sample size per variant
    d. Run chi-squared test across variants → boolean statistically_significant
    e. Pick winner: highest conversion rate (if directionally positive)
    f. Update experiment status in experiments.json: "running" → "canary"
    g. Set canary_until = now + 7 days
    h. Append experiment result to history.json:
       { type: "experiment", id, site, hypothesis, variants: [...],
         winner, lift, sample_size, statistically_significant,
         status: "canary", canary_until }
    i. Commit experiments.json + history.json

── PHASE B: CHECK CANARY EXPERIMENTS ──────────────────────────

 4. Filter experiments.json where status === "canary" AND canary_until < now
 5. FOR EACH canary experiment:
    a. Re-query PostHog for the canary variant's conversions over the canary period
    b. Compare canary period conversion rate vs the original measurement period
    c. IF conversion dropped >20%:
       i.   Set status → "canary_failed"
       ii.  Append to history.json: { type: "rollback", experiment_id, reason }
       iii. Log observation: "canary failed for <site> <experiment_type>"
    d. ELSE (canary holds):
       i.   Read winning variant config from generator/configs/<variant>.json
       ii.  Read base config from generator/configs/<site>.json
       iii. Copy ONLY copy fields from winner → base:
            HERO_EYEBROW, HERO_H1, HERO_SUB, MODAL_HEADLINE,
            MODAL_SUB, MODAL_SUCCESS_TEXT, FOOTER_TAGLINE,
            editorial, faq_items
       iv.  Write updated base config
       v.   Set status → "promoted", add commit hash
       vi.  Delete variant config files: <site>-v1.json, -v2.json, -v3.json
       vii. Delete variant Netlify sites via API:
            - GET https://api.netlify.com/api/v1/sites → find by name
            - DELETE https://api.netlify.com/api/v1/sites/<id>
       viii. Commit base config + experiments.json + history.json
       ix.   Push to remote
       x.    Trigger deploy.yml via workflow_dispatch:
             gh workflow run "Generate & Deploy Sites" (requires actions: write)
             NOTE: github.token pushes do NOT trigger on:push workflows

── PHASE C: READ SIGNALS ──────────────────────────────────────

 6. Fetch latest weekly-digest issue:
    a. GET /repos/{owner}/{repo}/issues?labels=weekly-digest&state=all&per_page=1
    b. Get issue number from response
    c. GET /repos/{owner}/{repo}/issues/{number}/comments
    d. Find comment containing "Automated Triage" → this is triage's analysis
    e. Extract triage comment body text

 7. Fetch latest hotel-refresh issue (same pattern):
    a. GET /issues?labels=hotel-refresh&per_page=1
    b. Check issue number against last_processed.hotel_refresh in history.json
    c. IF same issue number → skip (already acted on this month's data)
    d. GET comments → find triage comment
    e. ALSO: parse <!-- machine: {...} --> block from issue body → get count, top_hotel

 8. Fetch latest explore issue (same pattern):
    a. GET /issues?labels=opportunity&per_page=1
    b. Check issue number against last_processed.explore in history.json
    c. IF same issue number → skip
    d. GET comments → find triage comment
    e. Parse machine block → get top_city, score

 9. Fetch latest reconciliation issue (same pattern):
    a. GET /issues?labels=reconciliation&per_page=1
    b. Check issue number against last_processed.reconciliation in history.json
    c. IF same issue number → skip
    d. GET comments → find triage comment
    e. Parse machine block → get anomaly_count

10. Read history.json from disk

10b. Read STRATEGY-PACK.md machine-readable JSON blocks:
    a. Parse machine_strategy block → extract:
       - opportunity_ranking (ordered list of priorities)
       - content_priority (what content types to focus on)
       - risk_factors (active risks to check against)
       - kpis_primary (what metrics to optimise for)
       - timeline_expectations (are we on track?)
    b. Parse strategy_signals block → extract:
       - conversion_benchmarks (for experiment evaluation)
       - content_thresholds (40% unique data rule, 800 word minimum)
       - market_growth data (for city expansion scoring)
    c. Parse serp_intelligence block → extract:
       - Queries where opportunity is VERY_HIGH → prioritise content for these
       - Queries where forums_dominate → these are low-hanging fruit
    d. Feed extracted strategy context into Claude prompt (step 15)
       so the orchestrator makes strategy-aligned decisions

11. IF history.json has >50 entries AND history-summary.json is older than 7 days:
    a. Call Claude with all history entries
    b. Prompt: "Summarise these experiment results into lessons learned.
       What patterns work? What doesn't? What should we try next?"
    c. Write response to history-summary.json
12. Read history-summary.json if it exists

── PHASE D: ASSESS SIGNAL COVERAGE + DECIDE ───────────────────

12b. Count available signal sources and compute confidence:
    a. signal_sources_available = 0
    b. Check: weekly-digest triage comment exists? → +1
    c. Check: hotel-refresh triage comment exists? → +1
    d. Check: explore triage comment exists? → +1
    e. Check: reconciliation triage comment exists? → +1
    f. Check: history.json has ≥5 entries? → +1
    g. Check: STRATEGY-PACK.md machine JSON parsed successfully? → +1
    h. Check: PostHog AI agent data available? → +1
    i. Check: Google Hotels data available? → +1
    j. signal_coverage = signal_sources_available / 8
    k. Log: "Signal coverage: {signal_sources_available}/8 ({pct}%)"
    l. IF signal_coverage < 0.375 (3/8): log WARNING in decision,
       note "low-confidence decision — limited signal data"
    m. Include signal_coverage in Claude prompt and in history.json log

13. Check: is there already an active experiment (status "running" or "canary")?
    a. IF yes for ALL template-based sites → skip to step 18 (log "all slots occupied")
    b. IF yes for one site → only consider the other site

14. Build experiment options list:
    a. IF hotel-refresh machine block has action_needed=true AND triage recommends adding:
       → add option: { type: "hotel_add", site: <relevant_site>, priority: <from_triage> }
    b. IF explore machine block has score ≥70 city:
       → add option: { type: "city_add", city: <name>, priority: <score> }
    c. FOR EACH available template-based site:
       → check last 5 experiment types for this site in history.json
       → IF last 3 were copy tests → suggest: { type: "seo_test", site }
       → IF last 3 were seo tests → suggest: { type: "copy_test", site }
       → ELSE → suggest: { type: "copy_test", site } (default)
    d. IF 3 consecutive no-lift of same type on a site → exclude that type for that site
    e. IF no-lift across ALL types on a site → add observation: "traffic-insufficient"

15. Call Claude (Haiku) with decision prompt:
    Input:
    - Triage summaries (from steps 6-9)
    - Last 10 history entries + history-summary
    - Available experiment options (from step 14)
    - Current date, site traffic levels
    - **Strategy Pack context (from step 10b):**
      - Current opportunity ranking (e.g., "comparison editorial is #1 priority")
      - Active risk factors (e.g., "R1: thin content penalty risk is Critical")
      - Content quality thresholds (40% unique data, 800+ words)
      - AI conversion benchmark (15.9%) vs current AI agent conversion rate
      - SERP intelligence (which queries have VERY_HIGH opportunity)
    Prompt: "You are the orchestrator for Lite-Stack. Given these signals
    AND the strategic priorities from STRATEGY-PACK.md,
    which experiment should we run next? Pick ONE from the options.
    Your decision must align with current strategic priorities.
    Explain your reasoning in 2 sentences. Return JSON:
    { choice: <option_index>, reasoning: <string>,
      strategy_alignment: <which_priority_this_serves> }"

16. Parse Claude's response → get chosen experiment

17. Dispatch to executor:
    a. IF type === "copy_test":
       → execSync: node autoresearch/evolve.js --site <site> --variants 3
    b. IF type === "seo_test":
       → execSync: node autoresearch/seo-experiment.js --site <site>
    c. IF type === "hotel_add":
       → execSync: node autoresearch/hotel-add.js --site <site>
    d. IF type === "city_add":
       → execSync: node autoresearch/city-add.js --city <city>
    e. IF type === "skip":
       → log reasoning

18. Append to history.json:
    { type: "decision", timestamp, chosen: <type>, site: <site>,
      reasoning: <claude_reasoning>, signals_summary: <brief>,
      signal_coverage: <n/8>, strategy_alignment: <priority_served>,
      prediction: { expected_outcome: <string>, check_after: <ISO date> } }
    NOTE: the prediction field enables prediction accuracy scoring in
    Workflow 12 step 12. Every decision should include a falsifiable
    prediction about what will happen (e.g., "copy test on dubai-ultra
    will show ≥5% lift in member_joined, check after 2026-04-15").

19. Check for observations to log:
    a. IF any site has 3+ consecutive no-lift → append observation
    b. IF any experiment type has been skipped 3+ times → append observation

20. Commit history.json + any new files
21. Push to remote
22. IF any promotion happened in Phase B:
    → Trigger deploy.yml via: gh workflow run "Generate & Deploy Sites"
    (github.token pushes don't trigger on:push — must use workflow_dispatch)
23. Update last_processed issue numbers in history.json:
    { last_processed: { weekly_digest: <issue#>, hotel_refresh: <issue#>,
      explore: <issue#>, reconciliation: <issue#> } }
```

### Workflow 2: Generate Copy Variants (`evolve.js --generate`, enhanced)

```
TRIGGER: orchestrate.js dispatch OR manual CLI

 1. Parse CLI args: --site <name>, --variants <n>
 2. Validate: ANTHROPIC_API_KEY exists, NETLIFY_AUTH_TOKEN exists
 3. Read base config: generator/configs/<site>.json
 4. Validate: config exists, config has hotels, skip_deploy !== true
 5. Read history.json → get last 10 entries where site === <site>
 6. Build Claude prompt:
    a. System: "You are a CRO expert for a luxury hotel booking site."
    b. Include base config copy fields (JSON)
    c. Include last 10 history entries for this site:
       - What angles were already tested
       - Which won, which lost, and why
       - "Do NOT repeat angles that already showed no lift"
    d. Include variant rules: different angles, factual accuracy,
       HERO_H1 under 12 words, return JSON array only
    e. Add hypothesis requirement: "For each variant, include a
       'hypothesis' field explaining the psychological angle"
 7. Call Anthropic API: POST /v1/messages
    model: claude-haiku-4-5-20251001, max_tokens: 2048
 8. Parse response: extract JSON array via regex /\[[\s\S]*\]/
 9. Validate: array has N items, each has required copy fields
10. Build experiments.json entry (array format — supports parallel experiments):
    a. Read existing experiments.json (or create [] if missing)
    b. Check no existing entry for this site with status "running" or "canary"
    c. Append new entry:
    {
      site: <site>,
      base_site: <site>,
      started_at: ISO timestamp,
      measure_after: now + 7 days (ISO),
      status: "running",
      hypothesis: <from Claude>,
      variants: [{ name: <site>, label: "control", url: null, conversions: null }]
    }
11. Deploy control site:
    a. Run: node generator/generate.js <site>
    b. Read generated HTML: sites/<site>/index.html
    c. Replace YOUR_POSTHOG_KEY with actual key
    d. Write HTML back
    e. GET Netlify API /sites → find existing site by name
    f. Deploy: netlify deploy --dir=sites/<site> --prod --site=<id>
    g. Store URL in experiments entry
12. FOR EACH variant (i = 0 to N-1):
    a. Merge variant copy fields with base config: { ...baseCfg, ...variants[i] }
    b. Set SCHEMA_URL to https://<site>-v<i+1>.netlify.app
    c. Write variant config: generator/configs/<site>-v<i+1>.json
    d. Run: node generator/generate.js <site>-v<i+1>
    e. Inject PostHog key into generated HTML
    f. GET or CREATE Netlify site named <site>-v<i+1>
    g. Deploy: netlify deploy --dir=sites/<site>-v<i+1> --prod
    h. Store URL + label in experiments entry
13. Write experiments.json to disk
14. Log: "Experiment started. Measure after <date>"
```

### Workflow 3: Measure + Canary Promotion (`evolve.js --measure`, enhanced)

```
TRIGGER: orchestrate.js Phase A OR manual CLI

 1. Read experiments.json
 2. Validate: experiments.base_site matches --site arg
 3. Validate: status === "running" AND now > measure_after
 4. Read started_at → use as date filter for PostHog
 5. FOR EACH variant in experiments.variants:
    a. Call PostHog: GET /api/projects/@current/events/
       ?event=member_joined
       &properties=[{"key":"$current_url","value":"<url>","operator":"icontains"}]
       &after=<started_at>
    b. Count results → store as conversions
    c. Call PostHog for $pageview same filter → count visitors
    d. Store: { conversions, visitors, rate: conversions/visitors }
 6. Log conversion table to console
 7. Calculate statistical significance:
    a. Build contingency table: [conversions, non-conversions] per variant
    b. Chi-squared test → p-value
    c. Flag statistically_significant = (p < 0.05)
 8. Pick winner: variant with highest conversion rate
    (must be directionally positive vs control)
 9. IF winner !== control:
    a. Update experiments.json: status → "canary", canary_until → now + 7 days
    b. Append to history.json: full experiment result with canary status
    c. Log: "Winner: v<n>. Entering 7-day canary period."
10. ELSE:
    a. Update experiments.json: status → "complete"
    b. Append to history.json with winner: "control"
    c. Log: "Control won. No changes to base config."
11. Write experiments.json to disk
```

### Workflow 4: Machine-Readable Issue Creation (applied to all scripts)

```
PATTERN: Added to hotel-refresh.js, explore.js, reconcile.js, weekly-digest.js

 1. After script finishes its analysis, build machine block:
    a. hotel-refresh → { type: "hotel-refresh", count: <new_count>,
       top_hotel: <id>, action_needed: <bool>, cities_checked: <n> }
    b. explore → { type: "explore", top_city: <name>, top_score: <n>,
       candidates_evaluated: <n>, gsc_signals: <n>, action_needed: <bool> }
    c. reconcile → { type: "reconcile", anomaly_count: <n>,
       revenue_at_risk: <bool>, clean: <bool> }
    d. weekly-digest → { type: "weekly-digest", page_views: <n>,
       member_joined: <n>, search_rate: <pct>, booking_rate: <pct>,
       healthy: <bool> }
 2. Prepend to issue body: <!-- machine: <JSON> -->
 3. Follow with human-readable markdown (unchanged from current output)
 4. Create GitHub issue via API (unchanged)
```

### Workflow 5: Hotel Addition via PR (`hotel-add.js`, new)

```
TRIGGER: orchestrate.js dispatch

 1. Parse args: --site <site> OR --auto (reads latest hotel-refresh issue)
 2. IF --auto:
    a. GET /repos/{owner}/{repo}/issues?labels=hotel-refresh&state=all&per_page=1
    b. Parse issue body → extract <!-- machine: {...} --> block
    c. IF action_needed === false → exit (nothing to add)
    d. GET issue comments → find triage comment
    e. Parse triage comment for recommended hotels (look for priority order)
 3. Parse hotel data from issue body:
    a. Find JSON code blocks in issue body
    b. Parse each as hotel config snippet
    c. Filter by triage recommendation (if available)
    d. Take top 3 recommended hotels
 4. Read target site config: generator/configs/<site>.json
 5. Identify which city each hotel belongs to (from issue section headers)
 6. FOR EACH hotel to add:
    a. Check hotel ID not already in config (dedup)
    b. Add hotel object to config.hotels[city] array
 7. Write updated config to a new branch:
    a. git checkout -b auto/hotel-add-<date>
    b. Write config file
    c. git add generator/configs/<site>.json
    d. git commit -m "feat: add <n> hotels to <site> from hotel-refresh"
    e. git push -u origin auto/hotel-add-<date>
 8. Create draft PR via GitHub API:
    a. POST /repos/{owner}/{repo}/pulls
    b. title: "feat: add <n> hotels to <site>"
    c. body: list of hotels added with names, ratings, IDs
    d. draft: true
    e. labels: ["hotel-refresh", "auto-generated"]
 9. Append to history.json:
    { type: "decision", action: "hotel_add_pr", site, hotels: [...], pr_url }
10. Track graduation eligibility:
    a. Count consecutive hotel-add PRs merged without edits
    b. IF count >= 5 → note in history: "eligible for auto-promotion"
```

### Workflow 6: New City Launch via PR (`city-add.js`, new)

```
TRIGGER: orchestrate.js dispatch

 1. Parse args: --city <name> OR --auto (reads latest explore issue)
 2. IF --auto:
    a. GET /repos/{owner}/{repo}/issues?labels=opportunity&state=all&per_page=1
    b. Parse <!-- machine: {...} --> → get top_city, top_score
    c. IF top_score < 60 → exit (not worth pursuing)
    d. Parse issue body for hotel data:
       - Find the city's section in the markdown table
       - Extract hotel count, avg rating, niche type
 3. Choose a template config to clone:
    a. Read all configs in generator/configs/
    b. Find one with matching niche (e.g., "resort" → maldives-escape, "city-luxury" → dubai-ultra)
    c. Clone as starting point
 4. Generate city-specific copy via Claude:
    a. Build prompt with:
       - Cloned config's copy as reference style
       - City name, country, niche type
       - "Generate all copy fields for a luxury hotel booking site targeting <city>"
       - Include: HERO_EYEBROW, HERO_H1, HERO_SUB, MODAL_*, FOOTER_TAGLINE,
         editorial (title + 2 paragraphs), faq_items (5 Q&As), trust_items (3)
    b. Call Claude → parse JSON response
    c. Validate all required fields present
 5. Build new config:
    a. Start from cloned config
    b. Replace all copy fields with Claude's output
    c. Set BRAND_NAME, SCHEMA_URL, NETLIFY_SITE_NAME for new city
    d. Set hotels: {} (empty — will be populated from explore data)
    e. Set skip_deploy: false
 6. Add hotels from explore issue data:
    a. Re-query LiteAPI for top 8 hotels in this city (4★+, rating ≥7.5)
    b. Build hotel config snippets for each
    c. Add to config.hotels[<city>] array
 7. Write config: generator/configs/<city-slug>.json
 8. Generate the site to verify it works:
    a. Run: node generator/generate.js <city-slug>
    b. Verify: sites/<city-slug>/index.html exists and is >10KB
 9. Create draft PR:
    a. git checkout -b auto/city-add-<city-slug>
    b. git add generator/configs/<city-slug>.json
    c. git commit
    d. git push
    e. POST /repos/{owner}/{repo}/pulls (draft: true)
10. Append to history.json:
    { type: "decision", action: "city_add_pr", city, score, hotel_count, pr_url }
```

### Workflow 7: SEO Experiment (`seo-experiment.js`, new)

```
TRIGGER: orchestrate.js dispatch

 1. Parse args: --site <site>
 2. Validate: GOOGLE_SERVICE_ACCOUNT_JSON exists, ANTHROPIC_API_KEY exists
 3. Regenerate SEO pages (they're not in git — only exist during deploy):
    a. Run: node autoresearch/seo-pages.js --site <site>
    b. Verify: files now exist in sites/<site>/
 4. Find SEO pages for this site:
    a. List files in sites/<site>/*.html (exclude index.html)
    b. Filter for SEO landing pages (city-specific, amenity pages)
 5. Pick a page to test:
    a. Query GSC for all pages under this site
    b. Find pages with highest impressions but CTR < 3%
       (high impressions = Google shows it; low CTR = title/description not compelling)
    c. IF no GSC data → pick random SEO page
    d. Select target page
 6. Read current page's <title> and <meta name="description">
 7. Generate variants via Claude:
    a. Prompt: "Generate 3 alternative title tags and meta descriptions for
       this luxury hotel SEO page. Target keyword: <extracted from URL>.
       Current title: <current>. Current description: <current>.
       Rules: title under 60 chars, description under 155 chars,
       include target keyword, each variant must use a different angle
       (urgency, exclusivity, value, specificity).
       Return JSON array."
    b. Call Claude → parse JSON
 8. Deploy variant pages:
    a. FOR EACH variant (i = 1 to 3):
       i.   Copy the original HTML file
       ii.  Replace <title> with variant title
       iii. Replace <meta description> with variant description
       iv.  Write to: sites/<site>/<page-name>-v<i>.html
    b. Deploy full site (including variants) via Netlify
 9. Append to experiments.json array:
    {
      type: "seo_test",
      site: <site>,
      target_page: <page-name>,
      started_at: ISO,
      measure_after: now + 21 days,
      status: "running",
      variants: [
        { label: "control", url: <full_url>, title: <original_title> },
        { label: "v1", url: <variant_url>, title: <v1_title> },
        ...
      ]
    }
10. Submit variant URLs to Google for indexing:
    a. POST to Indexing API (if configured) OR
    b. Log: "Submit these URLs to GSC manually for faster indexing"
11. Append to history.json: { type: "experiment", status: "running", ... }
```

### Workflow 8: Triage → Orchestrator Signal Chain

```
EXISTING (triage.js) — documenting the chain for clarity:

 1. triage.yml fires on issue creation
 2. Read env vars: ISSUE_NUMBER, ISSUE_BODY, ISSUE_LABELS
 3. Determine issue type from labels:
    weekly-digest | reconciliation | hotel-refresh | opportunity
 4. Build type-specific Claude prompt:
    a. weekly-digest → "Verdict: 🟢/🟡/🔴, top actions, auto-close?"
    b. reconciliation → "Severity, anomaly analysis, auto-close?"
    c. hotel-refresh → "Which hotels worth adding, priority order"
    d. opportunity → "Top 2 opportunities, next concrete action"
 5. Call Claude Haiku with prompt + issue body (truncated to 3000 chars)
 6. Parse response:
    a. Check for auto-close indicators (🟢, "auto-close: yes")
 7. Post comment on issue:
    body = "### 🤖 Automated Triage\n\n" + analysis
 8. IF auto-close → PATCH issue state to "closed"

ORCHESTRATOR READS THIS CHAIN:
 9. orchestrate.js fetches the triage COMMENT (step 7 output), not the raw issue
10. This comment is Claude's distilled analysis — already prioritised, actionable
11. Orchestrator never re-processes the raw data triage already analysed
```

### Workflow 9: AI Agent MCP Build (`mcp-agent/`, new — Phase 0)

```
TRIGGER: Manual build (Week 1-2)

── STEP 1: FORK + LOCAL SETUP ─────────────────────────────────

 1. Clone github.com/liteapi-travel/mcp-server into mcp-agent/ directory
 2. Review package.json → identify dependencies (likely: @modelcontextprotocol/sdk, axios or fetch)
 3. npm install
 4. Copy LITEAPI_SANDBOX_PUBLIC_KEY from .env → mcp-agent/.env
 5. Run locally: npx mcp-server → verify 5 tools register (getHotels, getHotelDetails, getRates, preBook, book)
 6. Test: send getHotels request for Dubai → verify JSON response

── STEP 2: ADD CUG RATE FRAMING ───────────────────────────────

 7. Find the getRates tool handler (likely in src/tools/ or similar)
 8. After LiteAPI returns rate data, enhance each rate object:
    a. Calculate CUG discount: ((ssp_rate - cug_rate) / ssp_rate) * 100
    b. Add field: savings_percentage (rounded to nearest integer)
    c. Add field: framing_text = "£{cug_rate}/night — {savings_pct}% below typical OTA price"
    d. Add field: rate_type = "member_exclusive"
 9. Test: getRates for a known Dubai hotel → verify framing fields appear

── STEP 3: ADD QUALITY SCORE INJECTION ─────────────────────────

10. Find the getHotelDetails tool handler
11. After LiteAPI returns hotel details, compute quality score:
    a. Base score from star rating: 5★=8.0, 4★=6.5, 3★=5.0
    b. Review boost: +0.5 if rating ≥ 8.5, +1.0 if rating ≥ 9.0
    c. Review volume boost: +0.3 if reviews ≥ 500, +0.5 if ≥ 1000
    d. Amenity boost: +0.2 per premium amenity (spa, pool, restaurant)
    e. Cap at 10.0
    f. Add field: lite_stack_quality_score = computed score
    g. Add field: quality_label = "Exceptional" (≥9) | "Outstanding" (≥8) | "Very Good" (≥7) | "Good" (≥6)
12. Test: getHotelDetails for a 5-star Dubai hotel → verify quality score appears

── STEP 4: ADD BOOKING ATTRIBUTION ─────────────────────────────

13. Find the preBook and book tool handlers
14. Modify preBook handler:
    a. Instead of calling LiteAPI directly, route through:
       POST https://luxstay.netlify.app/.netlify/functions/liteapi
       with body: { action: "preBook", ...original_params }
    b. This ensures the booking hits the existing Netlify function which has PostHog tracking
    c. Add header: X-Booking-Source: ai-agent
    d. Add header: X-Agent-Session: <unique_session_id>
15. Modify book handler (same pattern):
    a. Route through Netlify function with X-Booking-Source: ai-agent
16. Test: preBook flow → verify PostHog receives ai_agent_booking_started event

── STEP 5: ADD POSTHOG EVENT TRACKING ─────────────────────────

17. Add PostHog server-side tracking (posthog-node library):
    a. npm install posthog-node
    b. Initialise with POSTHOG_PROJECT_KEY from .env
18. Fire events at each MCP tool invocation:
    a. getHotels → posthog.capture("ai_agent_search", { destination, filters })
    b. getHotelDetails → posthog.capture("ai_agent_hotel_viewed", { hotel_id, hotel_name })
    c. preBook → posthog.capture("ai_agent_booking_started", { hotel_id, rate, savings_pct })
    d. book → posthog.capture("ai_agent_booking_completed", { hotel_id, total, booking_id })
19. Use a persistent distinct_id per MCP session (generate UUID on first tool call, reuse)

── STEP 6: PACKAGE + DEPLOY ────────────────────────────────────

20. Create README.md with Claude Desktop installation instructions:
    a. Add to claude_desktop_config.json: { "mcpServers": { "lite-stack": { "command": "node", "args": ["path/to/mcp-agent/index.js"] } } }
    b. Required env vars: LITEAPI_API_KEY, POSTHOG_PROJECT_KEY
21. Test end-to-end in Claude Desktop:
    a. "Find me a luxury hotel in Dubai Marina under £400/night"
    b. Verify: search → results with CUG framing + quality scores → preBook → booking attributed
22. Create mcp-agent/package.json with proper name, version, description
23. Push to GitHub as JackH1010101010/lite-stack-mcp-agent (public repo)
```

### Workflow 10: Comparison Editorial Content Generation (Phase 1)

```
TRIGGER: Manual + semi-automated (Week 2-6)

── STEP 1: BUILD THE TEMPLATE ──────────────────────────────────

 1. Create generator/templates/comparison-guide.html:
    a. HTML structure with sections:
       - Opening summary (first 200 words — optimised for AI citation extraction)
       - Side-by-side comparison table (populated from config data)
       - Neighbourhood context section (walkability, transport, dining)
       - Price positioning analysis (CUG vs rack rate, seasonal variation)
       - Verdict section ("Choose X if... Choose Y if...")
       - CTA section: "See member rates for [hotel]" (gated behind sign-in)
    b. Include schema markup: FAQPage, ItemList, BreadcrumbList
    c. Include meta tags: og:image, twitter:card, canonical URL
    d. Style: consistent with LuxStay authority hub branding
    e. Responsive design (mobile-first — most travel research is mobile)
 2. Create generator/configs/comparison-guides/ directory for guide configs
 3. Define config schema for comparison guides:
    {
      "slug": "dubai-marina-vs-palm-jumeirah",
      "title": "Dubai Marina vs Palm Jumeirah: Luxury Hotel Guide 2026",
      "location_a": { "name": "Dubai Marina", "lat": 25.0800, "lng": 55.1400 },
      "location_b": { "name": "Palm Jumeirah", "lat": 25.1124, "lng": 55.1390 },
      "hotels_a": [ /* LiteAPI hotel objects with quality scores */ ],
      "hotels_b": [ /* LiteAPI hotel objects with quality scores */ ],
      "price_range_a": { "low": 180, "high": 650, "currency": "GBP" },
      "price_range_b": { "low": 250, "high": 1200, "currency": "GBP" },
      "neighbourhood_data": { /* walkability, transport, dining ratings */ },
      "faq_items": [ /* 5-8 FAQPage schema entries */ ],
      "verdict": { "choose_a_if": "...", "choose_b_if": "..." }
    }

── STEP 2: GENERATE FIRST 3 GUIDES (HIGH PRIORITY) ────────────

 4. FOR EACH of the top 3 comparison keywords:
    a. Dubai Marina vs Palm Jumeirah luxury hotels
    b. Maldives water villa vs beach villa
    c. Maldives vs Seychelles luxury honeymoon

    i.   Query LiteAPI for hotels in both locations:
         getHotels({ destination: location_a }) → filter 4★+, rating ≥ 7.5
         getHotels({ destination: location_b }) → same filter
    ii.  Compute quality scores for each hotel (same algorithm as MCP agent)
    iii. Compute price ranges from getRates (next 90 days, cheapest available)
    iv.  Build Claude prompt:
         "You are a luxury travel editor writing for LuxStay. Generate a
         comparison guide for {location_a} vs {location_b}.
         Data: {hotels_a_summary}, {hotels_b_summary}, {price_data}.
         Include: 200-word opening summary (factual, data-driven — this is
         the AI citation target), neighbourhood pros/cons, seasonal advice,
         5 FAQ items. Tone: authoritative but warm, not salesy.
         Return JSON matching the config schema."
    v.   Call Claude (Sonnet for quality) → parse JSON
    vi.  Human review: check factual accuracy, tone, data correctness
    vii. Write config to generator/configs/comparison-guides/{slug}.json
    viii. Generate: node generator/generate-guide.js {slug}
    ix.  Deploy to LuxStay subdirectory: luxstay.netlify.app/guides/{slug}

── STEP 3: GENERATE REMAINING 7 GUIDES ─────────────────────────

 5. Same process for remaining keywords (2-3 per week):
    - Santorini Oia vs Fira hotels
    - Bali Seminyak vs Ubud luxury
    - Paris Left Bank vs Right Bank luxury hotels
    - London Mayfair vs Knightsbridge hotels
    - Amalfi Coast vs Cinque Terre luxury stays
    - Tokyo Shinjuku vs Shibuya luxury hotels
    - Swiss Alps Zermatt vs St Moritz

── STEP 4: CONSENSUS TRIGGER DISTRIBUTION ──────────────────────

 6. FOR EACH published guide:
    a. Extract 2-3 key data insights (e.g., "We analysed 50 Dubai Marina
       hotels and found average member rates are 22% below OTA prices")
    b. Post to Reddit (r/travel, destination-specific subs):
       - Title: genuine question or insight format, NOT promotional
       - Body: share the data finding, link to full guide as source
       - Example: "Data point: Dubai Marina hotels average 22% cheaper
         through member rate programs vs Booking.com [analysis of 50 hotels]"
    c. Post to TripAdvisor forums (relevant destination threads)
    d. If opportunity: pitch to travel newsletter or YouTube creator
    e. Track distribution: log platform, URL, date in a distribution-log.json
    f. Goal: each guide referenced on ≥ 3 platforms within 2 weeks of publish
       (this triggers AI model citation — see STRATEGY-PACK.md Section 15)

── STEP 5: MEMBER RATE EXPLAINER CONTENT ───────────────────────

 7. Generate 3 evergreen explainer articles:
    a. "How luxury hotel member rates work (and how much you save)"
       - Target keywords: "hotel member rates", "CUG hotel rates"
       - Include: LiteAPI data showing actual savings across 100+ hotels
    b. "CUG hotel rates explained: the wholesale pricing model"
       - Target keywords: "CUG rates", "wholesale hotel rates"
       - Educational tone, data-backed
    c. "We compared member rates vs Booking.com on 100 hotels"
       - Proprietary data piece — strongest E-E-A-T signal
       - Include methodology, per-destination breakdowns, seasonal patterns
 8. Deploy to LuxStay: luxstay.netlify.app/guides/{slug}
 9. Distribute key findings (same consensus trigger process as step 6)
```

### Workflow 11: Google Hotels Rate Feed (`google-hotels-feed.js`, new — Phase 0.5)

```
TRIGGER: Manual build after Channex.io confirms integration path (Week 2-4)

── STEP 1: CHANNEX.IO INTEGRATION ──────────────────────────────

 1. Contact Channex.io:
    a. Email/form submission with inquiry:
       - "We're a CUG hotel booking platform with LiteAPI as rate source"
       - "Want to feed rates into Google Hotels via Free Booking Links"
       - Questions: Can we feed external rates? API access? Pricing?
    b. Evaluate response against alternatives:
       - If Channex works: proceed with steps below
       - If not: try SiteMinder, then direct Google Hotel Center API

 2. Set up Channex.io account:
    a. Register for developer/API access
    b. Get API credentials (store as CHANNEX_API_KEY in .env)
    c. Understand rate push format (likely ARI: Availability, Rates, Inventory)

── STEP 2: GOOGLE HOTEL CENTER SETUP ──────────────────────────

 3. Set up Google Hotel Center account:
    a. Go to Google Hotel Center → fill interest form
    b. Sign Content Licensing Agreement (CLA)
    c. Provide business details: LuxStay, luxury hotel booking, CUG model
    d. Link to Google Merchant Center if required
    e. Note: approval can take 2-4 weeks

── STEP 3: BUILD RATE FEED SCRIPT ──────────────────────────────

 4. Create autoresearch/google-hotels-feed.js:
    a. Read all site configs from generator/configs/*.json
    b. Extract all hotel IDs across all sites
    c. FOR EACH hotel:
       i.   Call LiteAPI getRates for next 90 days
       ii.  Extract: hotel_id, room_type, rate_per_night, currency, availability
       iii. Apply Lite-Stack markup (15% — from config or env var)
       iv.  Format for Channex API (ARI format):
            {
              hotel_id: <channex_property_id>,
              rates: [{ date: "2026-04-01", price: 285, currency: "GBP", available: true }],
              room_type: <mapped_room_type>
            }
       v.   Push to Channex API: POST /api/v1/rates (or equivalent endpoint)
    d. Log: hotels processed, rates pushed, any errors
    e. Verify price accuracy: compare feed price with what landing page shows
       (Google requires price match — discrepancies cause rejection)

 5. Add to deploy.yml as daily job:
    a. Cron: daily at 06:00 UTC (rates change daily)
    b. Env vars: LITEAPI_API_KEY, CHANNEX_API_KEY
    c. Error handling: if LiteAPI is down (health-check.js open issue), skip feed push
    d. Log output as GitHub Actions artifact for debugging

── STEP 4: LANDING PAGE ALIGNMENT ──────────────────────────────

 6. Ensure landing page prices match feed prices:
    a. Google Hotels shows the feed price → user clicks → lands on LuxStay
    b. LuxStay must show the SAME price (or lower) after sign-in
    c. If rate changes between feed push and user click:
       - Show the lower of (feed price, current LiteAPI price)
       - Never show a higher price than what Google displayed
    d. Add URL parameter tracking: ?source=google-hotels&hotel_id=X
    e. Fire PostHog event: google_hotels_click with hotel_id, displayed_price

 7. Monitor Google Hotel Center for:
    a. Price accuracy warnings → fix feed immediately
    b. Impression/click data → feed into orchestrator (Phase 3)
    c. Rejection reasons → address and resubmit
```

### Workflow 12: Strategy Pack Auto-Update (`strategy-update.js`, new — Phase 3+)

```
TRIGGER: orchestrate.yml (monthly, runs after monthly scripts on 1st)
         OR manual: node autoresearch/strategy-update.js

PURPOSE: The Strategy Pack (STRATEGY-PACK.md) is the system's strategic
intelligence layer. It must stay current as market conditions, competitive
landscape, and internal performance data change. This workflow automatically
expands and updates the Strategy Pack so the orchestrator always has fresh
strategic context.

── STEP 1: GATHER FRESH SIGNALS ────────────────────────────────

 1. Read current STRATEGY-PACK.md machine-readable JSON blocks:
    a. machine_strategy → current priorities, timelines, KPIs
    b. strategy_signals → current benchmarks, market data
    c. serp_intelligence → current SERP snapshots

 2. Gather internal performance data:
    a. Read history.json → extract experiment win rates, patterns
    b. Read latest weekly-digest issue → traffic, conversion trends
    c. Query PostHog for channel-level metrics:
       - ai_agent_booking_completed count (last 30 days)
       - google_hotels_click count (last 30 days)
       - Organic traffic by landing page category
    d. Read latest hotel-refresh + explore issues → inventory trends

 3. Gather external market signals:
    a. Run target SERP checks for 5 core queries (same as serp_intelligence):
       - "best luxury hotel dubai marina"
       - "dubai marina vs palm jumeirah"
       - "last minute luxury maldives water villa"
       - "maldives water villa worth price honeymoon"
       - "secret member rates luxury hotels dubai"
    b. Check: has Hotel Pack appeared/disappeared? New AI Overview citations?
       New competitors in results? Changes in forum dominance?
    c. Check AI citation status:
       - Query ChatGPT, Perplexity, Gemini for "luxury hotels [destination]"
       - Does Lite-Stack/LuxStay appear in citations?
       - Which competitors are cited?

── STEP 2: ANALYSE AND DRAFT UPDATES ──────────────────────────

 4. Call Claude (Sonnet — needs quality reasoning) with:
    a. Current STRATEGY-PACK.md (full text)
    b. Fresh signals from steps 2-3
    c. Prompt:
       "You are the strategic intelligence analyst for Lite-Stack.
       Compare the current Strategy Pack against these fresh signals.

       Identify:
       1. STALE DATA: Any numbers, rankings, or claims that have changed
       2. NEW OPPORTUNITIES: Market shifts, competitor changes, or new
          channels not yet covered
       3. RISK UPDATES: Any risk register items (R1-R15) that need
          severity/likelihood changes based on new evidence
       4. RESOLVED QUESTIONS: Any open questions (Q1-Q17+) that can now
          be answered with the fresh data
       5. PERFORMANCE VS PLAN: Are we hitting the Success Metrics
          timelines? What needs adjusting?
       6. STRATEGY SHIFTS: Should priority rankings change based on
          what's actually working?

       Return JSON:
       {
         stale_updates: [{ section, line_range, current_text, updated_text, reason }],
         new_opportunities: [{ title, description, estimated_impact, suggested_priority }],
         risk_updates: [{ risk_id, field_changed, old_value, new_value, evidence }],
         resolved_questions: [{ question_id, resolution, evidence }],
         performance_notes: [{ metric, expected, actual, recommendation }],
         strategy_shifts: [{ current_priority, suggested_priority, reasoning }],
         new_serp_data: { /* updated serp_intelligence JSON block */ },
         confidence: 'high' | 'medium' | 'low'
       }"

 5. Parse Claude's response → validate JSON structure

── STEP 3: APPLY UPDATES (GATED) ──────────────────────────────

 6. IF confidence === 'high' AND only stale_updates + risk_updates:
    a. Apply updates directly to STRATEGY-PACK.md
    b. Update machine-readable JSON blocks
    c. Increment version number in header
    d. Add entry to Research Log section with date and changes
    e. Commit: "chore: auto-update Strategy Pack v{n} — {summary}"
    f. Log to history.json: { type: "strategy_update", auto: true, changes: [...] }

 7. IF new_opportunities OR strategy_shifts OR confidence !== 'high':
    a. Create GitHub issue with label "strategy-review"
    b. Title: "Strategy Pack update — {n} changes proposed"
    c. Body: formatted summary of all proposed changes
    d. Include diff-style view of text changes
    e. Human reviews and approves before changes are applied
    f. Log to history.json: { type: "strategy_update", auto: false, pr_url }

── STEP 4: UPDATE ORCHESTRATOR CONTEXT ─────────────────────────

 8. After any Strategy Pack update:
    a. Re-read machine-readable JSON blocks
    b. Update orchestrator's strategic context for next decision cycle
    c. IF priority rankings changed → adjust experiment type weighting
    d. IF new risks emerged → add to orchestrator's pre-flight checks
    e. IF new opportunities identified → add to experiment options menu

── STEP 5: COMPETITIVE INTELLIGENCE SCAN ───────────────────────

 9. Monthly competitive scan (runs as part of this workflow):
    a. Check Secret Escapes, Voyage Privé, Luxury Escapes for:
       - New features or UX changes
       - New markets entered
       - AI agent or chatbot presence
       - Content strategy shifts
    b. Check if any new competitors have appeared in target SERPs
    c. Check LiteAPI MCP server forks on GitHub (competitive intelligence)
    d. Append findings to Competitive Content Analysis section (Section 20)

10. Update distribution-log.json with any new platform appearances:
    a. Where are our comparison guides being cited?
    b. Which platforms are driving referral traffic?
    c. Is the consensus trigger strategy working?

── STEP 6: TREND VELOCITY DETECTION ────────────────────────────

11. For each target keyword in the comparison guide list:
    a. Query Google Trends API for 30-day trend data
    b. Query Reddit API (r/travel, r/luxurytravel) for mention frequency
    c. Calculate velocity: mentions_this_month / mentions_last_month
    d. Flag keywords with velocity > 1.4 (40%+ increase) as "accelerating"
    e. Flag keywords with velocity < 0.6 (40%+ decrease) as "cooling"
    f. Output: trend_velocity.json with scored keyword list
    g. Feed into orchestrator: accelerating topics → prioritise content
       creation or refresh. Cooling topics → deprioritise.
    h. Example: "dubai marina vs palm jumeirah" velocity 1.6 →
       "accelerate this guide, topic trending across platforms"

── STEP 7: PREDICTION ACCURACY SCORING ─────────────────────────

12. Read prediction_log from history.json (predictions made at decision time):
    a. For each prediction older than its check_after date:
       - Compare predicted outcome vs actual outcome
       - Score: correct / partially_correct / incorrect
       - Examples:
         "AI agent converts at 15.9%" → check actual ai_agent conversion rate
         "Google Hotels live in 3-9 weeks" → check if feed is operational
         "Comparison guide indexed within 3 months" → check GSC indexing
    b. Calculate overall prediction accuracy percentage
    c. Log to Strategy Pack Section 24 (Research Log):
       "Prediction accuracy: X/Y correct (Z%)"
    d. IF accuracy < 50% on a category → flag for human review:
       "Our timeline predictions for [category] are unreliable — recalibrate"
    e. Feed accuracy data into Claude's strategy analysis prompt (step 4)
       so it can adjust confidence levels on future predictions
```

---

## Key Design Decisions

### Structured Issue Contract (Machine + Human Readable)

Every autoresearch script that creates a GitHub issue MUST include a machine-readable block at the top of the issue body:

```html
<!-- machine: {"type": "hotel-refresh", "count": 5, "top_hotel": "hotel-123", "action_needed": true} -->
```

The orchestrator does fast rule-based pre-filtering on this JSON before calling Claude. The human still sees readable markdown below it. Both consumers served by one output. This also enables future dashboarding — a simple script can pull all issues, parse the machine blocks, and show system health at a glance.

### Layered Intelligence (Triage Comment Reuse)

The orchestrator NEVER reads raw issue bodies. It reads triage.js comments on those issues. This creates a clean chain: raw data → triage analysis → orchestrator decision. Each layer adds intelligence without re-doing prior work. If triage.js improves, the orchestrator automatically benefits.

### Human Approval Gates (Pope Model)

| Action | Auto or Gated? | Rationale |
|--------|---------------|-----------|
| Copy A/B test winner → promote | **Auto** | Low risk, easily reversible, config-only change |
| SEO title/meta winner → promote | **Auto** | Low risk, GSC data is definitive |
| Price card display winner → promote | **Auto** | Low risk, config-driven rendering |
| Add hotel to existing city | **Gated** (draft PR) | New inventory = brand risk, human checks hotel quality |
| Launch new city/site | **Gated** (draft PR) | Significant — new Netlify site, copy quality matters |
| Change markup percentage | **Never auto** | Revenue impact, requires human decision |
| Delete a hotel or city | **Never auto** | Destructive action |

**Graduation path:** Gated actions can graduate to Auto after 5 consecutive approvals without edits. For example, after 5 hotel additions are all merged unchanged, hotel-add.js can auto-commit and just post a notification issue. The orchestrator tracks graduation eligibility in history.json. This is how the system builds trust over time — the Pope model's real power. Graduation is per-action-type and can be revoked by a single rejection.

### Experiment Isolation

Evolve.js deploys each variant as a **separate full Netlify site** (e.g., `maldives-escape-v1.netlify.app`). These are production-grade deploys, not preview URLs — they have their own PostHog tracking, own URL, own Netlify site ID. The main production site is never modified during an experiment. It only changes when a winner is promoted via git commit → deploy.yml rebuild.

**Constraint:** Only one experiment per brand at a time. If maldives-escape has an active copy test, the orchestrator won't start an SEO test on maldives-escape until the copy test is measured. Different brands can run experiments in parallel (maldives copy test + dubai-ultra SEO test).

**Experiment diversity scheduling:** With 2 template-based sites, the orchestrator can run 2 experiments simultaneously. It should actively balance experiment types per brand — if dubai-ultra has had 3 copy tests in a row, schedule an SEO test there next. Track "last 5 experiment types per brand" in history.json to prevent getting stuck in a local optimum on one experiment type.

### Traffic Splitting — How Variants Get Visitors

**This is the foundational problem.** Evolve.js deploys variants as separate Netlify sites (e.g., `maldives-escape-v1.netlify.app`). But these variant URLs have no organic traffic, no SEO indexing, no backlinks. The production site gets all the traffic. Without a mechanism to send visitors to variants, the A/B test measures nothing.

**Solutions (pick one — progressively better):**

1. **Option A — Paid micro-budget (recommended start):** Run Google Ads or Meta ads with a small budget (£10-20/week per variant). Each variant gets its own ad pointing to its URL. This is the simplest approach and also solves the low-traffic problem. The orchestrator could eventually manage ad budget allocation via the Google Ads API.

2. **Option B — Client-side redirect split:** Add a small script to the production site's `<head>` that randomly redirects ~30% of visitors to variant URLs (using a cookie to ensure consistency). This gives variants organic traffic without paid spend. Downside: adds a redirect hop, slightly harms UX.

3. **Option C — Netlify split testing (edge-level):** Netlify supports A/B testing via branch deploys with traffic splitting at the CDN edge. Each variant is deployed as a branch, and Netlify splits traffic server-side. No redirect, no UX impact. **This is the best long-term solution** but requires restructuring how variants are deployed (branch deploys instead of separate sites).

**Until one of these is implemented, copy A/B testing cannot produce meaningful data.** Phase 2 of the implementation plan should start with Option A (paid micro-budget) as a prerequisite — UNLESS Phases 0-1 generate enough organic/AI/Google Hotels traffic to test against. Re-evaluate at Week 4. SEO experiments are less affected because GSC measures impressions regardless of clicks.

### The Low-Traffic Problem

With 38 hotels across 3 sites and no paid acquisition yet, traffic is likely <100 visitors/day per site. This means:

- **Copy tests with 3 variants need ~500+ visitors per variant** for statistical significance at p<0.05. At current traffic, that's 2-4 weeks per experiment, not 72 hours.
- **Measurement windows should start at 7 days** for copy tests and increase to 14 days if sample sizes remain small.
- **The orchestrator should log sample size** and flag when results aren't significant. Still promote directionally positive winners, but note uncertainty.
- **SEO experiments are more viable** because GSC provides impression data regardless of click volume. A page can get 10,000 impressions with only 50 clicks — still enough to measure CTR changes.
- **Long-term fix:** Paid traffic (even £50/week on Google Ads) to variant URLs would dramatically speed up experiment cycles. The orchestrator could eventually manage ad budget allocation.

### Error Handling and Circuit Breakers

The orchestrator needs guardrails:

- **Anthropic API down:** Fall back to rule-based decision (e.g., always run copy test on least-recently-tested site)
- **PostHog API down:** Skip measurement, extend experiment window by 7 days
- **LiteAPI down:** health-check.js already detects this and creates an issue. Orchestrator should not start new experiments when health-check issues are open.
- **Experiment variant deploy fails:** Log error, don't update experiments.json, retry next week
- **3 consecutive no-lift of the same type on a site:** Orchestrator switches to a different experiment type for that site (e.g., copy → SEO). Logs an `observation` entry.
- **No-lift across ALL experiment types on a site:** Flags the site as traffic-insufficient. Orchestrator suggests "this site needs traffic acquisition before further testing" and focuses resources on the other site. This turns the circuit breaker into a diagnostic tool — it doesn't just stop, it tells you why.
- **System-wide: 5 consecutive no-lift across all sites:** Pause autonomous experiments entirely, create a GitHub issue flagging the need for manual strategic review (e.g., is the product fundamentally working? Is tracking broken?).

### Rollback Mechanism (with Canary Period)

Winners go through a two-stage promotion:

1. **Canary period (7 days):** The winning variant's Netlify site stays live. The orchestrator notes it as `status: "canary"` in experiments.json. Production site is unchanged.
2. **Promotion:** If the canary holds (conversion doesn't regress >20% vs the control period), merge the winner into the base config via git commit → deploy.yml rebuild. Delete variant sites.
3. **Rollback:** If conversion drops >20% during canary, revert by simply noting `status: "canary_failed"` — no git revert needed because production was never changed. Log as `type: "rollback"` in history.json.

Post-promotion rollback (if regression appears after merge):
- The orchestrator compares this week's digest metrics against last week's
- If conversion drops >20% within 7 days of a promotion, auto-revert: restore the previous config from git history and redeploy
- Flag the experiment type + site as "needs manual review"

The canary period catches novelty effects and seasonal variance before they reach production. The rollback is "don't promote" rather than "revert a commit," which is faster and cleaner.

### Cost Management

Claude API calls per week (estimated, all Haiku):
- Orchestrator decision: 1 call (~2K tokens) = ~$0.001
- Multi-agent scoring (Phase 5): 3 calls = ~$0.003
- Copy variant generation: 1 call (~3K tokens) = ~$0.002
- SEO variant generation: 1 call (~2K tokens) = ~$0.001
- Triage per issue: ~4 issues/week = ~$0.004
- Weekly digest: 0 additional (digest is data, triage already analyses it)

**Total: ~$0.05/week in Claude API costs.** Negligible.

Netlify: Each experiment creates up to 3 temporary sites. Free tier allows 500 sites. With weekly cleanup, max ~6 variant sites at any time. Fine.

GitHub Actions: ~15-20 mins/week across all workflows. Free tier = 2,000 mins/month. Fine.

---

## Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `mcp-agent/` (directory) | 0 | Fork of LiteAPI MCP server with CUG framing, quality scores, booking attribution |
| `mcp-agent/index.js` | 0 | MCP server entry point (enhanced fork) |
| `mcp-agent/package.json` | 0 | MCP agent dependencies |
| `mcp-agent/README.md` | 0 | Claude Desktop installation instructions |
| `generator/templates/comparison-guide.html` | 1 | HTML template for comparison editorial content |
| `generator/configs/comparison-guides/` | 1 | Directory for comparison guide config JSONs (10 guides) |
| `generator/generate-guide.js` | 1 | Script to generate comparison guides from config + template |
| `autoresearch/google-hotels-feed.js` | 0.5 | Daily rate feed: LiteAPI → Channex → Google Hotels |
| `autoresearch/distribution-log.json` | 1 | Tracks consensus trigger distribution (platform, URL, date per guide) |
| `autoresearch/history.json` | 2 | Append-only experiment results log (start as `[]`) |
| `.github/workflows/orchestrate.yml` | 2 | Wednesday cron for the orchestrator |
| `autoresearch/orchestrate.js` | 3 | Brain: reads signals, picks experiment, dispatches |
| `autoresearch/seo-experiment.js` | 3 | SEO A/B testing (title tags, meta descriptions) |
| `autoresearch/hotel-add.js` | 4 | Auto-add hotels from refresh findings (creates draft PR) |
| `autoresearch/city-add.js` | 4 | Auto-launch new city sites from explore findings (creates draft PR) |
| `autoresearch/price-experiment.js` | 4 | Price card display testing (needs template changes) |
| `autoresearch/rate-monitor.js` | 5 | Competitive rate/margin monitoring |
| `autoresearch/strategy-update.js` | 3 | Monthly Strategy Pack auto-update: SERP checks, AI citation monitoring, competitive scan, auto-apply stale data fixes, gate strategy shifts |
| `autoresearch/history-summary.json` | 3 | Auto-generated lessons-learned digest (created by orchestrator when history >50 entries) |

## Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `generator/template.html` | 0.5 | Add img width/height + decoding="async", og:image, Twitter Card, dns-prefetch, Hotel/Offer schema on main pages |
| `generator/template.html` | 4 | Add `price_card_variant` config field for price display experiments |
| `luxstay/index.html` | 0.5 | Add same technical fixes (img dimensions, og:image, schema) — manual since not on generator |
| `luxstay/index.html` | 1 | Add comparison guide navigation/links from authority hub |
| `autoresearch/evolve.js` | 2 | Add history.json logging, status/measure_after fields, read history in variant generation prompt, 7-day window |
| `.github/workflows/deploy.yml` | 0.5 | Add daily cron job for google-hotels-feed.js; already has `workflow_dispatch` trigger for orchestrator |
| `autoresearch/hotel-refresh.js` | 2 | Add machine-readable JSON comment block to issue body |
| `autoresearch/explore.js` | 2 | Add machine-readable JSON comment block to issue body |
| `autoresearch/explore.js` | 4 | Include LiteAPI hotel IDs in the opportunity report (needed by city-add.js) |
| `autoresearch/reconcile.js` | 2 | Add machine-readable JSON comment block to issue body; standardise env var from `GITHUB_REPO` to `GITHUB_REPOSITORY` |
| `autoresearch/weekly-digest.js` | 5 | Add GSC keyword gap analysis section to digest output |

**Note:** `experiments.json` does not exist yet — it's created by evolve.js on first run. No modification needed; just ensure evolve.js creates it with the right schema from the start.

---

## Success Metrics

### After 2 weeks (Phase 0 complete):

- **AI Agent:** MCP server deployed and testable in Claude Desktop — end-to-end flow from search → CUG rates → booking works
- **PostHog events:** ai_agent_search, ai_agent_hotel_viewed, ai_agent_booking_started all firing correctly
- **Quality scores:** Lite-Stack quality scores appearing in agent responses for all hotel lookups
- **Booking attribution:** At least 1 test booking routed through Netlify functions and tracked in PostHog

### After 4 weeks (Phases 0.5 + 1 underway):

- **Technical fixes shipped:** img dimensions, og:image, Hotel schema, 3 new PostHog events — all deployed
- **Google Hotels:** Hotel Center account application submitted, Channex.io contacted with integration inquiry
- **Editorial content:** ≥3 comparison guides published on LuxStay with LiteAPI data
- **Consensus trigger:** Each published guide shared on ≥2 platforms (Reddit + 1 other)
- **AI agent bookings:** ≥1 real booking through the AI agent channel (even from own testing)

### After 8 weeks (Phase 2 starting):

- **Google Hotels:** Rate feed operational (if Channex confirmed) OR alternative path identified
- **Editorial content:** All 10 comparison guides + 3 explainer articles published
- **Google indexing:** ≥5 comparison guides indexed by Google
- **AI citation:** ≥1 comparison guide cited by an AI model (ChatGPT, Perplexity, or Claude) — test by querying the models
- **Traffic growth:** LuxStay traffic ≥2x baseline from Google Hotels + editorial organic + AI referrals
- **Orchestrator pipeline:** orchestrate.yml running every Wednesday without errors, history.json accumulating entries
- **First A/B tests:** ≥2 copy experiments run with meaningful sample sizes (now that traffic exists)

### After 12 weeks:

- **Revenue:** ≥5 bookings attributable to new channels (AI agent + Google Hotels + editorial organic)
- **Experiments:** ≥8 experiments run across copy + SEO types, ≥1 winner promoted
- **Autonomous hotel additions:** ≥1 PR auto-created from hotel-refresh data
- **SEO gains:** ≥1 title tag optimisation promoted from GSC data
- **Self-awareness:** Orchestrator avoids repeating experiment types that consistently show no lift

### After 6 months (stretch):

- **Revenue run rate:** ≥£500/month from combined channels
- **Autonomous city launch:** ≥1 new city launched via the pipeline (human-approved PR)
- **German market:** First German-language comparison guides published, targeting Google.de
- **AI agent distribution:** MCP agent available beyond Claude Desktop (ChatGPT plugin or Perplexity integration explored)
- **Multi-agent decisions:** 3-perspective scoring producing measurably different choices than single-agent
- **Rate monitoring:** Margin compression alerts catching real issues
- **LuxStay migration complete:** Authority hub running on generator template, fully in autonomous loop

---

## Recommended Build Order

**Revenue-first principle:** Build things that generate traffic and bookings BEFORE building things that optimise them.

**Week 1-2 (Phase 0 — AI Agent MVP):**
1. Fork LiteAPI MCP server → local setup + testing (Workflow 9, steps 1-6)
2. Add CUG rate framing to getRates handler (Workflow 9, steps 7-9)
3. Add quality score injection to getHotelDetails handler (Workflow 9, steps 10-12)
4. Add booking attribution through Netlify functions (Workflow 9, steps 13-16)
5. Add PostHog server-side event tracking (Workflow 9, steps 17-19)
6. Package, test end-to-end in Claude Desktop, push to GitHub (Workflow 9, steps 20-23)

**Week 2 (Phase 0.5A — Technical Quick Fixes, 1-2 days):**
7. Template fixes: img width/height, decoding="async" (Task 0g)
8. Add og:image, Twitter Card, dns-prefetch to template (Task 0h)
9. Add Hotel/Offer schema to main index pages (Task 0i)
10. Add 3 missing PostHog events: rate_revealed, price_comparison_viewed, editorial_cta_clicked (Task 0j)

**Week 2-4 (Phase 0.5B — Google Hotels, parallel with editorial):**
11. Contact Channex.io, evaluate integration path (Workflow 11, step 1)
12. Set up Google Hotel Center account (Workflow 11, steps 3a-3e)
13. Build google-hotels-feed.js once Channex confirms (Workflow 11, steps 4-5)
14. Ensure landing page price accuracy (Workflow 11, steps 6-7)

**Week 2-6 (Phase 1 — Editorial Content, parallel with Google Hotels):**
15. Build comparison guide HTML template + config schema (Workflow 10, steps 1-3)
16. Generate first 3 high-priority comparison guides (Workflow 10, step 4)
17. Generate remaining 7 comparison guides, 2-3 per week (Workflow 10, step 5)
18. Distribute key findings for consensus trigger (Workflow 10, step 6)
19. Generate 3 member-rate explainer articles (Workflow 10, step 7)

**Week 4-6 (Phase 2 — Wire Up Optimisation Loop):**
20. Create `history.json` + modify evolve.js (experiment memory foundation)
21. Machine-readable JSON blocks in all issue-creating scripts (Workflow 4)
22. `orchestrate.yml` with simple logic: measure → canary → promote → dispatch evolve.js
23. Auto-commit + Netlify cleanup in orchestrate.yml

**Week 1-2 (Phase 0, parallel — Business Development):**
6b. Email LiteAPI + Selfbook re: Perplexity integration path (Task 0f-ii, zero-engineering inquiry)

**Week 6-8 (Phase 3 — Orchestrator Brain):**
24. `orchestrate.js` — full brain with layered intelligence + AI agent/Google Hotels signals + Strategy Pack machine JSON
25. `seo-experiment.js` (GSC data is the best signal available)
26. Migrate LuxStay to generator (CRITICAL — authority hub must be in autonomous loop)
27. `strategy-update.js` — monthly Strategy Pack auto-update (Workflow 12): SERP checks, AI citation monitoring, competitive scan, stale data fixes

**Week 8-10 (Phase 4 — Auto-Acting):**
28. `hotel-add.js` (auto-add hotels via draft PR)
29. `city-add.js` (auto-launch cities via draft PR)
30. `price-experiment.js` (highest conversion value but needs template changes)

**Week 10+ (Phase 5 — Scale):**
31. Multi-agent orchestrator upgrade (3-perspective scoring)
32. `rate-monitor.js` (competitive rate/margin monitoring)
33. GSC keyword gap analysis in weekly-digest.js
34. PromptFoo quality gates
35. German market entry (hreflang, /de/ subdirectory, translated guides)
36. AI agent enhancements (Perplexity Selfbook, web chat interface)
37. Graduation tracking — gated actions earn auto status after 5 clean approvals
38. Content freshness automation — 30-day refresh cycle for comparison guides using latest LiteAPI data

---

## Open Questions

### RESOLVED

1. ~~**Should luxstay be migrated to the generator?**~~ **YES — CRITICAL.** LuxStay is the designated authority hub (Strategy Pack Q1). All editorial content, AI citation, and Google Hotels traffic flows here. Migration scheduled for Phase 3 (Week 6-8). Must be done before the authority hub can enter the autonomous loop.

2. ~~**Revenue timeline — when do we see first bookings?**~~ **RESOLVED.** Original plan assumed 9-15 months via SEO. New channels front-loaded: AI agent (1-2 weeks to first booking potential), Google Hotels (3-9 weeks), editorial organic (3-6 months). See Strategy Pack Section 21, Q5.

3. ~~**Content strategy — AI-generated or human-written?**~~ **RESOLVED.** Hybrid: AI-generated with LiteAPI data + human editorial review. See Strategy Pack Section 21, Q3.

4. ~~**Domain consolidation — which site is primary?**~~ **RESOLVED.** LuxStay is the authority hub. All editorial investment concentrated there. See Strategy Pack Section 21, Q1.

### OPEN

5. **Paid traffic for experiment execution (still needed for Phase 2+).** Variant sites have no organic traffic. Without paid ads (even £10/week per variant) or a client-side redirect split, copy A/B testing produces zero data. HOWEVER: this is now less urgent because Phases 0-1 generate traffic FIRST. By the time Phase 2 starts, Google Hotels + editorial organic may provide enough baseline traffic. Re-evaluate at Week 4. Budget if needed: £30-60/week. See "Traffic Splitting" section for options.

6. **GSC service account configured?** Several scripts (weekly-digest, explore, seo-experiment) use GSC data but it requires `GOOGLE_SERVICE_ACCOUNT_JSON` as a GitHub secret. Is this set up?

7. **PostHog personal API key configured?** evolve.js measurement and weekly-digest both need `POSTHOG_PERSONAL_KEY` (different from the project key used for tracking). Is this set up?

8. **Channex.io integration feasibility?** Can Channex accept external rate sources (LiteAPI) or does it only work with PMS-connected properties? This is the gating question for the Google Hotels path. Fallback: SiteMinder or direct Hotel Center API. Must be answered by Week 3.

9. **LiteAPI MCP server license?** The fork needs to be checked for open-source license terms. If MIT/Apache, straightforward. If more restrictive, may need to build MCP tools from scratch using LiteAPI REST API docs instead of forking.

10. **Comparison guide hosting structure?** Two options: (a) LuxStay subdirectory `/guides/dubai-marina-vs-palm-jumeirah` (better for domain authority), or (b) separate subdomain `guides.luxstay.com` (easier deployment). Recommendation: subdirectory (a) for stronger SEO signal. Confirm before building template.

11. **PostHog server-side tracking for MCP agent?** The MCP agent runs on the user's machine (Claude Desktop), not on a server. PostHog server-side SDK (posthog-node) needs a way to fire events from the client machine. Options: (a) direct PostHog API calls from the MCP agent, (b) route all tracking through Netlify functions. Option (a) is simpler but exposes the PostHog project key in the MCP agent code. Option (b) is more secure but adds latency.

12. **Content freshness cadence?** Strategy Pack recommends 30-day refresh cycle for all editorial pages. With 10 comparison guides + 3 explainer articles = 13 pages, that's ~3 pages per week needing price/availability data refreshed from LiteAPI. Should this be automated (re-query LiteAPI, update price ranges, redeploy) or manual? Recommendation: automate via a `content-refresh.js` script in Phase 3.

13. **Lighthouse ChatGPT hotel app — competitive threat?** Lighthouse launched a zero-commission ChatGPT hotel booking app (March 2026) using a flat-fee subscription model. Expedia and Booking.com also have ChatGPT apps. Does our MCP agent need to be listed in a ChatGPT app store, or is Claude Desktop distribution sufficient for Phase 0? Re-evaluate after first month of agent usage data.

14. **POSTHOG_PROJECT_KEY in .env — is this the same as POSTHOG_PERSONAL_KEY?** The .env file has `POSTHOG_PROJECT_KEY` (for client-side tracking). evolve.js measurement and weekly-digest need `POSTHOG_PERSONAL_KEY` (for API queries). These are different keys. Confirm both are set up as GitHub secrets.
