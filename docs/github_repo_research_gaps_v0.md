# GitHub Repo Research Gaps v0

## Purpose

This file identifies capability areas where the current repo pool is weak or missing good candidates. Each gap is mapped to a stack role defined in the stack thesis and technology evaluation framework. These gaps should drive targeted research to find better tools, frameworks, or architectural approaches.

---

## Gap 1: Portfolio State Management

- Capability needed: structured knowledge and portfolio state
- What the company needs: A system to explicitly track the lifecycle of opportunity families, hypotheses, experiments, wedges, and decisions. The portfolio model requires state transitions (idea → research track → active experiment → live wedge → committed position or killed), comparable scoring across tracks, promotion and kill criteria, and explicit decision history. This is the central nervous system of the business.
- What was found in the repo pool: engram (SQLite + FTS5 agent memory), memsearch (markdown-based memory with vector search), edgequake (GraphRAG knowledge graphs), OpenViking (hierarchical filesystem memory). All of these are agent memory systems. None are designed for business portfolio lifecycle management.
- What is still missing: No repo provides structured state management for a portfolio of business opportunities. The gap is not just a database; it is a schema and lifecycle engine that enforces stages, tracks transitions, supports scoring, and enables comparison. The closest analog outside the repo pool would be a purpose-built experiment tracker or a structured knowledge base with lifecycle semantics.
- Suggested research action: Search for open-source experiment tracking platforms (beyond ML experiment trackers like MLflow/Weights & Biases), lightweight CRM-like state machines, or decision management systems. Evaluate whether a custom schema on top of SQLite or a structured markdown convention (like planning-with-files) can serve as the initial portfolio state system. Consider Notion/Airtable-like tools as temporary bridges if no good OSS option exists.

---

## Gap 2: Booking and Travel API Integration Layer

- Capability needed: search and booking integration
- What the company needs: An integration layer that wraps LiteAPI (or equivalent travel API) and exposes clean primitives for hotel search, availability checking, rate comparison, booking execution, and booking status. This layer must support geographic and proximity-based queries, handle rate complexity, and abstract the specifics of the upstream provider so the rest of the stack does not couple to LiteAPI directly.
- What was found in the repo pool: Nothing. No repo in the pool addresses travel booking APIs, hotel search integration, or hospitality commerce in any form.
- What is still missing: The entire travel API integration layer is absent from the repo pool. This is expected: LiteAPI is a specific commercial API, and the repo pool is drawn from general GitHub trending, not travel-tech. The company needs either a custom wrapper around LiteAPI or an open-source travel API abstraction layer.
- Suggested research action: Search specifically for open-source hotel/travel API wrappers, OTA integration libraries, or hospitality commerce SDKs. Evaluate LiteAPI's own SDK and documentation quality. Assess whether a thin custom wrapper is preferable to adopting an external abstraction. Check for Amadeus, Sabre, or Booking.com API client libraries that might inform the abstraction design even if LiteAPI is the initial provider.

---

## Gap 3: SEO Experimentation and Programmatic Page Generation

- Capability needed: content and landing-page generation, site deployment and hosting
- What the company needs: A system for programmatically generating, deploying, testing, and pruning large numbers of SEO-optimized landing pages targeting high-intent travel search queries. The targeted destination SEO booking hypothesis depends on creating hundreds or thousands of location-specific, intent-specific pages and measuring which convert. This requires template-driven page generation, automated SEO optimization, A/B testing capability, and systematic performance measurement.
- What was found in the repo pool: claude-seo (SEO auditing for Claude), json-render (AI-generated UI via JSON schemas), vinext (Cloudflare-deployable Next.js alternative). claude-seo audits but does not generate. json-render generates constrained UI but is not SEO-focused. vinext provides deployment infrastructure but not content generation.
- What is still missing: No repo provides an end-to-end programmatic SEO pipeline: template definition → content generation → deployment → measurement → pruning. The individual pieces (auditing, constrained generation, edge deployment) exist in fragments, but no repo combines them into a page experimentation system. The company also needs travel-specific content patterns (destination descriptions, hotel comparisons, proximity-based recommendations).
- Suggested research action: Search for open-source programmatic SEO tools, static site generators optimized for large-scale page generation (Astro, Eleventy with dynamic data), and SEO experiment frameworks. Evaluate whether a custom pipeline combining claude-seo (auditing) + json-render (structure) + vinext (deployment) could be assembled. Research how competitors in the travel SEO space generate pages at scale.

---

## Gap 4: Analytics Pipeline for Conversion and Economics

- Capability needed: analytics and event tracking, observability and reporting
- What the company needs: An analytics pipeline that tracks the full funnel from search impression → page visit → engagement → booking intent → booking completion → revenue → margin. The pipeline must support per-experiment, per-wedge, per-market comparison. It must make portfolio economics visible: which experiments are profitable, which markets convert, which positioning angles work. This is essential for the exploitation loop and portfolio decision-making.
- What was found in the repo pool: dash (self-learning data analyst agent, appears three times), agentlytics (AI tool usage metrics), ChartGPU (GPU-accelerated charting). dash is an analyst agent, not a pipeline. agentlytics tracks coding assistant usage, not business conversion. ChartGPU is a visualization library, not an analytics system.
- What is still missing: No repo provides a conversion funnel analytics pipeline. The gap includes event collection, funnel definition, cohort analysis, experiment comparison, and economic reporting. The company needs something between a simple event tracker (Plausible, PostHog) and a full data warehouse (BigQuery, Snowflake). The ideal tool would support experiment-level granularity and portfolio-level aggregation.
- Suggested research action: Evaluate open-source analytics platforms: PostHog (product analytics with experiment support), Plausible (privacy-focused web analytics), Umami (simple web analytics), and Metabase (BI dashboards on top of SQL databases). Assess whether PostHog's experiment and funnel features cover the portfolio comparison need. Consider whether a lightweight pipeline (event collection → SQLite/DuckDB → dashboard) is sufficient for the early stage.

---

## Gap 5: Decision Logging and ADR Systems

- Capability needed: decision logging and review
- What the company needs: A structured system for recording architecture decisions, market decisions, experiment outcomes, and portfolio changes. Each decision should capture what was decided, why, what alternatives were considered, what evidence supported it, and what would trigger reconsideration. The stack thesis explicitly calls for "one decision log or ADR-style record system."
- What was found in the repo pool: planning-with-files (markdown-based working memory), agent-trace (provenance tracking for AI-generated code). planning-with-files provides a workflow pattern but not a structured decision record format. agent-trace tracks code provenance, not business decisions.
- What is still missing: No repo provides a structured ADR (Architecture Decision Record) system adapted for business decisions. The company needs both technical ADRs (stack choices) and business ADRs (market choices, experiment conclusions, wedge promotions/kills). No existing tool in the pool enforces the decision template format described in the stack thesis.
- Suggested research action: Search for open-source ADR tools (adr-tools, Log4brains, MADR). Evaluate whether a simple markdown-based ADR convention with templates stored in the repo is sufficient. Consider whether the decision log should be integrated with the portfolio state system (Gap 1) so that portfolio transitions automatically generate decision records.

---

## Gap 6: Agent Coordination Without Creating Sprawl

- Capability needed: agent coordination and multi-agent supervision
- What the company needs: A lightweight coordination layer that allows multiple autonomous agents (research agent, content agent, monitoring agent, scoring agent) to operate in parallel without creating sprawl, duplicating work, conflicting with each other, or accumulating uncontrolled state. The doctrine explicitly warns against "agent sprawl without clear jobs or guardrails."
- What was found in the repo pool: Antfarm (YAML + SQLite + cron workflows), Conductor (multi-agent orchestration), openfang (agent OS for continuous tasks), mission-control (multi-agent task manager), Klaw (Kubernetes-style agent orchestration), overstory (parallel agents with SQLite messaging). Many options exist, but most are designed for coding agents and may introduce the sprawl the doctrine warns against. Klaw's Kubernetes metaphor is explicitly too heavy for the early stage.
- What is still missing: A coordination layer specifically designed for bounded business autonomy. The ideal system would enforce clear job boundaries per agent, prevent duplicate work, manage shared state access, support approval gates for high-risk actions, and expose what each agent is doing in human-readable form. None of the repo pool candidates combine all of these properties. Antfarm comes closest in simplicity but lacks approval gates and shared state management.
- Suggested research action: Assess Antfarm more deeply as the simplest viable starting point. Evaluate whether Antfarm + a shared state layer (engram or memsearch) + a simple approval mechanism covers the coordination need. Research whether CrewAI, AutoGen, or LangGraph (not in the trending pool but well-known) provide better bounded-autonomy coordination. Consider whether the coordination layer should be custom-built as a thin wrapper around existing primitives rather than adopted as a framework.

---

## Gap 7: Market Research and Data Enrichment Tools

- Capability needed: research capture and market intelligence, data enrichment and scraping
- What the company needs: Tools for gathering travel market intelligence: hotel pricing data, occupancy patterns, demand signals by destination, competitor positioning, search volume by intent and location, seasonal patterns, and supply quality indicators. The opportunity sensing layer depends on structured market data, not just general web scraping.
- What was found in the repo pool: Rodney (browser automation CLI), pinchtab (AI-controlled Chrome browser), agent-browser (token-efficient agent browser), text2geo (offline geocoder), OpenPlanter (recursive investigation agent). These provide general-purpose scraping and geocoding. None are travel-specific.
- What is still missing: No repo provides travel-specific data enrichment. The company needs structured data about hotel inventory quality, pricing dynamics, competitor landing pages, search volume for travel intents, and seasonal demand patterns. General scraping tools can gather raw data but do not structure it into travel-domain intelligence. The geocoder (text2geo) helps with location data but not with market economics.
- Suggested research action: Search for open-source travel data tools, hotel price monitoring systems, and search volume analysis tools. Evaluate Google Trends API wrappers for travel intent data. Research whether SerpAPI or similar search result APIs have open-source alternatives. Assess whether a custom scraping pipeline built on Rodney or agent-browser, combined with structured extraction templates for travel sites, is the most practical path. Check for open datasets on hotel supply, tourism demand, or travel booking economics.

---

## Gap 8: Experiment Registry and Lifecycle Management

- Capability needed: experiment registry and comparison
- What the company needs: A system for defining, tracking, comparing, and concluding experiments. Each experiment should have a hypothesis, success criteria, time boundary, assigned resources, measured outcomes, and a conclusion (promote, iterate, kill). The portfolio model requires experiments to be comparable and time-bounded, not open-ended.
- What was found in the repo pool: Nothing directly addresses experiment lifecycle management. planning-with-files provides a markdown tracking pattern. Trellis (AI project management) is the closest but is a general project management tool, not an experiment system.
- What is still missing: The entire experiment registry capability. The company needs to define an experiment, set its boundaries, collect results, compare it against alternatives, and record the conclusion. This is distinct from portfolio state (Gap 1), which tracks the broader lifecycle. The experiment registry is the operational layer for running and concluding individual tests.
- Suggested research action: Search for open-source experiment management platforms beyond ML (which has MLflow, Neptune, W&B). Evaluate whether a lightweight custom system (experiments as markdown files with structured frontmatter + a comparison dashboard) is more appropriate than adopting a framework. Consider whether PostHog's experiment features (if adopted for analytics, see Gap 4) can double as the experiment registry. Assess whether Notion or Airtable templates can serve as temporary experiment registries.

---

## Summary

| Gap | Stack role | Severity | Best current option in pool | Action |
|-----|-----------|----------|---------------------------|--------|
| Portfolio state management | Structured knowledge and portfolio state | High | engram (partial) | Research purpose-built options or design custom schema |
| Booking/travel API integration | Search and booking integration | High | None | Research travel API wrappers, assess LiteAPI SDK |
| SEO experimentation and page generation | Content and landing-page generation | High | claude-seo + json-render + vinext (fragments) | Research programmatic SEO tools, evaluate assembly |
| Analytics pipeline | Analytics and event tracking | High | None (dash is an agent, not a pipeline) | Evaluate PostHog, Plausible, Umami, custom pipeline |
| Decision logging / ADR | Decision logging and review | Medium | planning-with-files (pattern only) | Research ADR tools, consider integrated approach |
| Agent coordination without sprawl | Agent coordination | Medium | Antfarm (simplest) | Deep-assess Antfarm, evaluate CrewAI/AutoGen/LangGraph |
| Market research and data enrichment | Research capture, data enrichment | Medium | Rodney + text2geo (general tools) | Research travel-specific data tools and APIs |
| Experiment registry | Experiment registry and comparison | Medium | None | Design lightweight custom system or evaluate PostHog |

The four high-severity gaps (portfolio state, booking integration, SEO page generation, analytics pipeline) represent the capabilities most essential to the early stack that have no strong candidates in the current repo pool. These should be the priority targets for the next round of technology research.
