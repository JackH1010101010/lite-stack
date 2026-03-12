# GitHub Repo Role Map v0

## Purpose

This document maps relevant GitHub repos (direct fit, adjacent fit, and idea sources) to the company's stack roles. Each role section identifies leading candidates, promising alternatives, and idea sources, with notes on what the role needs and what the current candidate set is missing.

Only repos classified as direct fit, adjacent fit, or idea source only are included here. See the candidate registry for the full evaluation of all ~319 repos.

---

## Research Capture and Market Intelligence

### Leading candidates
- **x-research-skill** — MCP skill for searching and analyzing X/Twitter discussions. Could monitor travel sentiment, trending destinations, and customer complaints in real time. Adjacent fit, now horizon.

### Promising alternatives
- **discrawl** — Mirrors Discord servers into searchable SQLite. Could capture travel community discussions for market signals. Adjacent fit, later horizon.
- **dash** — Self-learning data analyst agent. Could analyze market research data, synthesize findings, and surface insights. Adjacent fit, later horizon.

### Idea sources only
- **autoresearch** — Autonomous iterative research loop pattern from Karpathy. The hypothesize-test-evaluate-iterate architecture is directly transferable to market opportunity research.
- **OpenPlanter** — Recursive investigation agent pattern. Could inspire agents that follow chains of market intelligence (destination → supply → competitors → demand signals).
- **HermitClaw** — Self-directed research agent that selects topics and writes reports. Pattern for autonomous opportunity sensing, but needs strategic guardrails.
- **financial-services-plugins** — MCP plugin architecture for domain-specific data access. Inspires equivalent travel data MCP connectors (LiteAPI, tourism boards, review APIs).

### Notes
- This role needs: reliable, structured market data ingestion from travel-specific sources (hotel APIs, tourism statistics, competitor pricing, review aggregators, search volume data). Social media intelligence is supplementary, not primary.
- Current candidate set is weak on travel-specific data sources. No repo directly connects to hotel supply, booking demand, or travel industry databases. This is the most important gap to fill with targeted research or custom development.
- The pattern repos (autoresearch, OpenPlanter, HermitClaw) provide strong architectural inspiration for the autonomous research loop, but none are directly usable.

---

## Structured Knowledge and Portfolio State

### Leading candidates
- **memsearch** — Markdown as source of truth with vector indexing. Aligns with the doctrine's insistence on human-readable state. From Zilliz. Adjacent fit, now horizon.
- **engram** — Persistent memory using SQLite + FTS5 full-text search. Simple, self-contained, no external dependencies. Adjacent fit, now horizon.

### Promising alternatives
- **edgequake** — Rust GraphRAG that builds knowledge graphs from documents. More powerful but more complex than flat search. Adjacent fit, later horizon.

### Idea sources only
- **OneContext** — Shared, resumable context across agent sessions. Pattern for how portfolio state should be accessible to all agents working on different research tracks.
- **OpenViking** — ByteDance project storing agent memory as hierarchical filesystem. Philosophically aligned with human-readable state — portfolio organized as browsable folders and files.
- **planning-with-files** — Markdown files as persistent working memory. Directly applicable pattern for storing research tracks, experiment state, and decision history as version-controlled markdown.
- **Ars Contexta** — Knowledge graph providing structured context to agents. Pattern for how agents should understand current hypotheses, experiments, and competitive landscape.

### Notes
- This role needs: a system that makes portfolio state (active hypotheses, experiment status, decision history, market knowledge) explicit, queryable, and human-inspectable. It must support the portfolio lifecycle: research → hypothesis → experiment → wedge → promotion/kill.
- memsearch and engram are the strongest near-term candidates. memsearch wins on human-readability (markdown-first), engram wins on query power (FTS5). They could potentially be combined.
- The knowledge graph approaches (edgequake, Ars Contexta) are premature for the early stack but may become valuable when the research corpus is large enough to benefit from relational structure.
- No candidate directly models the portfolio lifecycle with explicit states, promotion criteria, and transition logic. This may need custom development.

---

## Experiment Registry and Comparison

### Leading candidates
- **Trellis** — AI project management and task coordination. Could model experiments as tasks with lifecycle states, outcomes, and comparison data. Adjacent fit, later horizon.

### Promising alternatives
- (None identified in the current candidate pool)

### Idea sources only
- **nWave** — Structured six-stage development lifecycle for agents. The stage-gate pattern could be adapted for the experiment lifecycle (design → launch → measure → compare → promote/kill).

### Notes
- This role needs: a system to define, track, compare, and decide on bounded experiments. Each experiment should have a hypothesis, scope, timeline, success criteria, and outcome. The system should make comparison easy and kill decisions explicit.
- This is one of the weakest roles in the current candidate set. No repo is purpose-built for experiment lifecycle management in a business context. Trellis is the closest but is generic project management.
- This role may need to be filled by custom development on top of the structured knowledge layer, or by adapting a lightweight task/project management tool.
- Research gap: look for A/B testing platforms, experiment tracking tools (e.g., from ML experiment tracking adapted to business experiments), and lightweight portfolio management systems.

---

## Orchestration and Workflow Execution

### Leading candidates
- **Antfarm** — YAML + SQLite + cron multi-agent workflow system. Maximum simplicity, minimum infrastructure. Aligns strongly with the doctrine's preference for tools simpler than the workflows they manage. Adjacent fit, now horizon.
- **GitHub Agentic Workflows** — AI agents as scheduled GitHub workflows defined in markdown. Zero additional infrastructure if already on GitHub. Adjacent fit, now horizon.

### Promising alternatives
- **Fynt** — Self-hostable workflow automation (n8n alternative) with visual node editor. More capable but more complex than Antfarm. Adjacent fit, now horizon.
- **takt** — LLM agent workflow orchestrator. Purpose-built for coordinating agent tasks. Adjacent fit, now horizon.
- **symphony-ts** — TypeScript port of Symphony agent orchestration. More sophisticated framework for later-stage needs. Adjacent fit, later horizon.

### Idea sources only
- **Conductor** — Multi-agent orchestration with specialized sub-agents. Pattern for decomposing complex business workflows into specialized agent roles (researcher, content writer, monitor, analyst).

### Notes
- This role needs: a lightweight way to define, schedule, and monitor recurring workflows — market research sweeps, content audits, competitor checks, experiment monitoring, portfolio reviews. It must support both scheduled (cron) and event-triggered execution.
- The current candidate set offers a good spectrum from simple (Antfarm, GitHub Agentic Workflows) to moderate (Fynt, takt) to sophisticated (symphony-ts). The doctrine strongly favors starting simple.
- Recommendation: start with Antfarm or GitHub Agentic Workflows for initial orchestration. Graduate to Fynt or takt only when workflow complexity demands it. Defer symphony-ts until multi-agent coordination is proven necessary.
- Key risk: choosing an orchestration layer that is more complex than the workflows it manages. The early stack likely needs 5-10 recurring workflows, not a workflow platform.

---

## Content and Landing-Page Generation

### Leading candidates
- **claude-seo** — AI-powered SEO auditing. Directly supports the content experimentation loop for travel destination pages. Direct fit, now horizon.

### Promising alternatives
- **json-render** — AI-generated UIs constrained by JSON schemas. Could enable AI agents to produce travel landing pages from structured data using predefined booking components. Adjacent fit, later horizon.

### Idea sources only
- (None identified — content generation for travel pages is highly domain-specific)

### Notes
- This role needs: the ability to generate, test, and iterate on travel landing pages at speed. Pages need strong SEO, clear messaging for narrow booking intent, and integration with the booking layer. The system should support programmatic page creation for different destinations, neighborhoods, and use cases.
- claude-seo addresses one slice (auditing), but the full content generation pipeline is not well-served by the current candidate pool. No repo generates travel-specific landing page content or handles the full create-deploy-measure cycle.
- json-render is interesting for later-stage automation of page generation, but high-trust booking pages may need more design control than AI generation currently provides.
- Research gap: look for headless CMS tools, programmatic page builders, SEO content generation frameworks, and template-driven page systems designed for high-volume landing page creation.

---

## Site Deployment and Hosting

### Leading candidates
- **vinext** — Cloudflare Vite plugin reimplementing Next.js API surface. 4.4x faster builds, 57% smaller bundles. Direct fit, now horizon, but medium risk due to project maturity.

### Promising alternatives
- (None identified — most trending repos are not focused on deployment infrastructure)

### Idea sources only
- (None)

### Notes
- This role needs: fast, reliable deployment of travel booking pages to edge locations close to international travel audiences. Must support rapid iteration (deploy experiments quickly), rollback, and multi-site management (different destination pages).
- vinext is the only candidate and its maturity is a concern. If Cloudflare is the deployment platform, vinext could be transformative for build speed and bundle size. If not, standard Vercel/Netlify/Cloudflare Pages workflows may be more reliable.
- Research gap: the deployment and hosting decision depends on the broader infrastructure strategy (Cloudflare vs. Vercel vs. self-hosted). This role may be filled by platform choice rather than a specific repo.

---

## Search and Booking Integration

### Leading candidates
- **text2geo** — Offline fuzzy geocoder converting place names to GPS coordinates. Essential for proximity-based hotel booking — the company's core use case family. Direct fit, now horizon.
- **mapcn** — MapLibre GL map library for interactive web maps. Essential for showing hotel locations relative to landmarks and neighborhoods. Direct fit, now horizon.

### Promising alternatives
- (None identified — booking integration will primarily come through LiteAPI, not open-source repos)

### Idea sources only
- (None)

### Notes
- This role needs: integration with LiteAPI for hotel search, availability, rates, and booking. It also needs geocoding for location-based queries, interactive maps for hotel discovery, and potentially search UI components.
- text2geo and mapcn are strong supporting components but do not address the core booking integration, which depends on LiteAPI. No repo in the trending pool provides hotel search or booking API functionality.
- This is expected — booking integration is a commercial API layer (LiteAPI), not an open-source trending project. The repos here are supplementary components (geocoding, maps) that enhance the booking experience.
- Research gap: evaluate LiteAPI integration patterns, look for hotel data normalization tools, and consider whether any open-source travel data APIs could supplement LiteAPI coverage.

---

## Analytics and Event Tracking

### Leading candidates
- (None identified as a clear leader)

### Promising alternatives
- **dash** — Self-learning data analyst agent. Could autonomously analyze booking funnels, conversion data, and experiment outcomes. Adjacent fit, later horizon.

### Idea sources only
- **Claude Ads** — Google/Meta ad account auditing with 180+ checks. Pattern for comprehensive automated audit of marketing channels.
- **ChartGPU** — WebGPU-accelerated charting for large datasets. Pattern for high-performance analytics visualization.
- **Liveline** — Lightweight React animated line chart. Pattern for real-time dashboard components.

### Notes
- This role needs: event tracking for booking funnel steps (search, view, compare, book), page analytics (traffic, engagement, conversion by destination/page), experiment outcome measurement, and marketing attribution. It must support the decision review process described in the doctrine.
- This is a significant gap in the current candidate pool. No repo provides a purpose-built analytics or event tracking system suitable for travel booking.
- Analytics will likely require established tools (PostHog, Plausible, Mixpanel, or custom event pipelines) rather than trending GitHub repos. dash is the only candidate that could provide analytical capability, but it's an analyst agent, not an analytics infrastructure.
- Research gap: evaluate self-hosted analytics platforms (PostHog, Plausible), event pipeline tools, and lightweight data warehouse options. This role is critical for the doctrine's emphasis on evidence-based decisions.

---

## Observability and Reporting

### Leading candidates
- **Uptimer** — Serverless uptime monitoring on Cloudflare Workers with status page. Lightweight, low-cost, fits the deployment strategy. Direct fit, now horizon.

### Promising alternatives
- (None identified as purpose-built observability tools in the candidate pool)

### Idea sources only
- (None)

### Notes
- This role needs: monitoring of booking page uptime and performance, agent workflow health, error tracking, and anomaly detection. It should also support operational reporting — what ran, what succeeded, what failed, what changed.
- Uptimer covers uptime monitoring but is only one slice of observability. The company will also need error tracking, log aggregation, agent behavior monitoring, and operational dashboards.
- Research gap: evaluate lightweight observability stacks (Grafana/Loki, Sentry, Betterstack) and self-hosted options. This role will likely be filled by established tools rather than trending repos.

---

## Decision Logging and Review

### Leading candidates
- (None identified)

### Promising alternatives
- (None identified)

### Idea sources only
- **planning-with-files** — Markdown files as persistent working memory. The pattern of version-controlled markdown files maps directly to ADR-style decision logging.

### Notes
- This role needs: a system for recording decisions (market selection, experiment outcomes, wedge promotions/kills, stack changes) in a format that is durable, searchable, and reviewable. The doctrine requires explicit, recorded, justified decisions.
- No repo in the candidate pool is designed for decision logging or architecture decision records. This is an important gap given the doctrine's emphasis on explicit decision records.
- This role may be best filled by a simple convention (markdown files in a git repo, following an ADR template) rather than a dedicated tool. The structured knowledge layer (memsearch or engram) could also serve this purpose.
- Research gap: evaluate lightweight ADR tools, decision record frameworks, and whether the structured knowledge layer can double as a decision log.

---

## Authentication, Permissions, and Operational Safety

### Leading candidates
- **agent-vault** — Secret-aware file layer protecting API keys during agent file operations. Directly relevant as agents interact with LiteAPI, analytics, and deployment services. Adjacent fit, now horizon.

### Promising alternatives
- **Crust** — Security gateway that intercepts and filters dangerous AI agent tool calls. Provides a control layer for bounded autonomy. Adjacent fit, later horizon.

### Idea sources only
- (None)

### Notes
- This role needs: API key protection, permission boundaries for autonomous agents, approval gates for high-risk actions (publishing, pricing changes, booking configuration), and audit trails.
- agent-vault addresses secret protection at the file level. Crust addresses action filtering at the tool-call level. Together they cover two important safety surfaces, but neither provides full permission management or approval workflows.
- The doctrine requires configurable approval gates — tighter for high-risk actions, looser for low-risk research. No candidate provides this configurability out of the box.
- Research gap: evaluate permission and approval workflow tools. Consider whether the orchestration layer (Antfarm, GitHub Agentic Workflows) can incorporate approval gates natively.

---

## Agent Coordination and Multi-Agent Supervision

### Leading candidates
- (None identified as a clear leader for business agent coordination)

### Promising alternatives
- **openfang** — Agent OS for autonomous workers running research, scraping, and lead generation tasks. Closest to the company's autonomous ambition, but high complexity risk. Adjacent fit, later horizon.

### Idea sources only
- **hive** — Self-evolving agent framework where failures improve the system. Conceptually compelling for long-term autonomy, but too risky and uncontrolled for near-term adoption.
- **Conductor** — Multi-agent orchestration with specialized sub-agents. Pattern for decomposing business operations into specialized autonomous roles.
- **Skyll** — Runtime skill retrieval API for agents. Pattern for modular, composable agent capabilities that can be updated without redeployment.
- **OneContext** — Shared context across agent sessions. Pattern for ensuring agents working on different tracks share a common understanding.

### Notes
- This role needs: coordination of multiple autonomous agents working on different tasks (market research, content generation, monitoring, analysis) with shared state, non-conflicting actions, and human oversight.
- This is a later-horizon role per the stack thesis. The early stack should use simple orchestration (Antfarm, cron) rather than a dedicated multi-agent supervision layer.
- openfang is the closest match but carries high infrastructure risk. The doctrine explicitly warns against orchestration systems more complicated than the workflows they manage.
- Recommendation: defer dedicated agent coordination. Use the orchestration layer for simple agent scheduling in the early phase. Revisit when the number of concurrent autonomous agents justifies coordination infrastructure.

---

## Data Enrichment and Scraping

### Leading candidates
- **Rodney** — CLI browser automation from Simon Willison. Clean, scriptable, suitable for autonomous research pipelines. Direct fit, now horizon.
- **agent-browser** — Vercel Labs CLI browser for AI agents with DOM noise stripping. Token-efficient for agent-driven web research. Adjacent fit, now horizon.

### Promising alternatives
- **pinchtab** — HTTP server for AI agent browser control with bot-detection bypass. Valuable for travel sites that actively block automation. Adjacent fit, now horizon.
- **kreuzberg** — Document processing toolkit (57 formats, OCR, tables). Useful for processing travel reports, PDFs, and industry documents. Adjacent fit, later horizon.

### Idea sources only
- **Login Machine** — Automated website login including MFA/SSO. Pattern for accessing authenticated data sources, but carries legal and operational risk.

### Notes
- This role needs: reliable extraction of competitor pricing, hotel data, destination content, review data, search volume proxies, and market intelligence from web sources. Must work with travel-specific sites that often have anti-bot measures.
- The current candidate set is strong for browser-based scraping (Rodney, agent-browser, pinchtab) with different tradeoffs: Rodney for simplicity, agent-browser for token efficiency, pinchtab for bot-detection bypass.
- kreuzberg adds document processing for non-web sources (PDFs, reports).
- Key concern: anti-bot detection on travel sites (Booking.com, Expedia, Google Hotels). pinchtab's bot-detection bypass is potentially valuable but may degrade over time.
- Research gap: evaluate proxy rotation services, CAPTCHA solving options, and whether travel data aggregators or APIs provide cleaner access than scraping.

---

## Internal Tooling and Operator Workflow

### Leading candidates
- (None identified as purpose-built internal tooling)

### Promising alternatives
- **Trellis** — AI project management. Could serve as the operator's view into portfolio state, experiments, and agent activity. Adjacent fit, later horizon.

### Idea sources only
- (None)

### Notes
- This role needs: dashboards and workflows for the human operator to review portfolio state, approve agent actions, compare experiments, make kill/promote decisions, and monitor system health. The doctrine requires that human approval remain easy to insert or remove.
- No repo in the candidate pool is designed for internal operator tooling in a business context. Most "dashboard" repos are for monitoring coding agents.
- This role will likely require custom development or adaptation of existing admin/dashboard frameworks. It should integrate with the structured knowledge layer (portfolio state) and the observability layer.
- Research gap: evaluate lightweight admin panel frameworks (Retool, Appsmith, custom Next.js admin) and whether the structured knowledge layer can power a simple operator review interface.

---

## Coverage Summary

| Role | Leading Candidates | Strength |
|---|---|---|
| Research capture and market intelligence | x-research-skill | Weak — no travel-specific data sources |
| Structured knowledge and portfolio state | memsearch, engram | Moderate — good candidates, need portfolio lifecycle |
| Experiment registry and comparison | Trellis | Weak — no purpose-built experiment tracker |
| Orchestration and workflow execution | Antfarm, GitHub Agentic Workflows | Strong — good simple-to-complex spectrum |
| Content and landing-page generation | claude-seo | Weak — SEO auditing only, no generation pipeline |
| Site deployment and hosting | vinext | Moderate — single candidate, maturity risk |
| Search and booking integration | text2geo, mapcn | Moderate — supporting components only, core is LiteAPI |
| Analytics and event tracking | (none) | Very weak — major gap |
| Observability and reporting | Uptimer | Weak — uptime only, needs deeper observability |
| Decision logging and review | (none) | Very weak — major gap |
| Auth, permissions, operational safety | agent-vault | Moderate — secret protection, needs approval workflows |
| Agent coordination and multi-agent supervision | (none for now) | Expected gap — later horizon per doctrine |
| Data enrichment and scraping | Rodney, agent-browser | Strong — three browser automation options |
| Internal tooling and operator workflow | (none) | Weak — will need custom development |

## Critical Research Gaps

1. **Analytics and event tracking** — No viable candidate. This is a doctrine-critical role (evidence-based decisions require measurement). Research established self-hosted analytics platforms immediately.
2. **Decision logging and review** — No candidate. May be solvable with conventions (markdown ADRs in git) rather than tooling.
3. **Experiment registry and comparison** — No purpose-built candidate. The portfolio model depends on structured experiment lifecycle management. Evaluate whether the knowledge layer can be extended or if a dedicated tool is needed.
4. **Travel-specific market intelligence** — No candidate connects to hotel supply data, booking demand, tourism statistics, or travel industry APIs. This is the business's core information need and may require custom development or commercial data partnerships.
5. **Content generation pipeline** — claude-seo provides auditing but no repo supports the full create-deploy-measure cycle for travel landing pages at scale.
6. **Internal operator dashboard** — No candidate. The human operator needs a clear view into portfolio state, agent activity, and pending decisions. Will likely require custom development.
