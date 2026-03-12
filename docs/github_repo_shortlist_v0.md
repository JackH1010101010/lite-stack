# GitHub Repo Shortlist v0

## Purpose

This shortlist contains the most relevant open-source repositories for the near-term company stack. Each repo has been evaluated against the operating doctrine, working venture thesis, and stack thesis. Only repos that plausibly fill a defined stack role and could accelerate learning speed, experiment velocity, or operational clarity are included.

Repos are ordered by stack role. The shortlist is deliberately selective: most repos from the source pool were excluded because they serve coding-agent workflows, niche developer tooling, or capabilities that do not map to the company's immediate needs.

---

## Orchestration and Workflow Execution

### Fynt

- URL: https://github.com/abhinavkale-dev/fynt
- Role: orchestration and workflow execution
- Why shortlisted: Self-hostable workflow automation platform comparable to Zapier or n8n with a visual node editor. Directly useful for orchestrating research pipelines, experiment triggers, content generation workflows, monitoring loops, and booking-related automation without building custom orchestration from scratch.
- Horizon: now
- Key upside: Visual node editor makes workflow creation accessible. Self-hostable means full control. General-purpose design fits many business workflows (research, publishing, monitoring, alerting).
- Key downside: Maturity and community size unknown compared to established alternatives like n8n. May require significant customization for portfolio-specific workflows.
- Verdict: assess further

### Antfarm

- URL: https://github.com/snarktank/antfarm
- Role: orchestration and workflow execution, agent coordination
- Why shortlisted: Multi-agent workflow system using simple YAML definitions, SQLite for state, and cron for scheduling. Aligns strongly with the stack thesis preference for modularity, clear state, and simplicity over complex orchestration infrastructure.
- Horizon: now
- Key upside: Extremely simple architecture (YAML + SQLite + cron). Easy to inspect, modify, and replace. Low maintenance burden. Scheduling built in.
- Key downside: Simplicity may become a limitation as workflows grow more complex. Unclear how well it handles conditional branching, approval gates, or rollback.
- Verdict: likely now

### GitHub Agentic Workflows (gh-aw)

- URL: https://github.com/github/gh-aw
- Role: orchestration and workflow execution
- Why shortlisted: Framework to run AI agents as scheduled GitHub workflows defined in markdown. Zero additional infrastructure needed. Fits the principle of avoiding orchestration systems more complicated than the workflows they manage.
- Horizon: now
- Key upside: No infrastructure to maintain. Leverages existing GitHub Actions. Markdown-defined workflows are human-readable and version-controlled. Scheduling and triggers come free.
- Key downside: Tied to GitHub Actions execution model. May be too constrained for complex multi-step business workflows. Limited control over execution environment.
- Verdict: assess further

### takt

- URL: https://github.com/nrslib/takt
- Role: orchestration and workflow execution
- Why shortlisted: Workflow orchestrator designed to coordinate multiple LLM agents. While originally oriented toward coding tasks, the coordination pattern generalizes to business automation (research agents, content agents, monitoring agents).
- Horizon: later
- Key upside: Purpose-built for LLM agent coordination with structured workflow definitions. Could serve as the orchestration backbone for autonomous research and execution loops.
- Key downside: Primarily designed for coding workflows. May need significant adaptation for business-domain orchestration. Community maturity unclear.
- Verdict: assess further

---

## Structured Knowledge and Portfolio State

### engram

- URL: https://github.com/Gentleman-Programming/engram
- Role: structured knowledge and portfolio state
- Why shortlisted: Persistent state layer using Go, SQLite, and FTS5 full-text search. Provides durable, searchable state for agents across sessions. The SQLite foundation aligns with the preference for inspectable, file-based state. Could be adapted to hold portfolio state (tracks, hypotheses, experiments, decisions).
- Horizon: now
- Key upside: SQLite is inspectable, portable, and low-maintenance. FTS5 enables rich querying. Persistence across sessions fits the portfolio state requirement. Simple enough to adapt.
- Key downside: Designed as agent memory, not as a business portfolio state system. Would require schema design work to map to the opportunity research and portfolio model. No built-in support for lifecycle stages (idea → hypothesis → experiment → wedge → decision).
- Verdict: assess further

### memsearch

- URL: https://github.com/zilliztech/memsearch
- Role: structured knowledge and portfolio state, research capture
- Why shortlisted: File-based memory system using markdown as the source of truth with vector indexing for semantic search. Markdown-native approach means state is human-readable and version-controllable. Vector search adds retrieval power for research knowledge bases.
- Horizon: now
- Key upside: Markdown as source of truth is fully inspectable. Vector indexing enables semantic retrieval across research documents. Clean separation between storage (files) and retrieval (index).
- Key downside: Designed for agent memory, not structured business state. No schema enforcement or lifecycle management. Vector indexing adds a dependency layer.
- Verdict: assess further

### edgequake

- URL: https://github.com/raphaelmansuy/edgequake
- Role: structured knowledge, research capture and market intelligence
- Why shortlisted: Rust implementation of GraphRAG that builds knowledge graphs from documents. Could structure market research, competitor analysis, and destination data into queryable knowledge graphs rather than flat document collections.
- Horizon: later
- Key upside: Knowledge graph approach makes relationships between entities (markets, destinations, competitors, intents) explicit and queryable. Could power sophisticated opportunity sensing.
- Key downside: GraphRAG is a heavier abstraction than the early stack likely needs. May introduce premature complexity before the research corpus is large enough to benefit. Rust dependency.
- Verdict: likely later

---

## Content and Landing-Page Generation

### claude-seo

- URL: https://github.com/AgriciDaniel/claude-seo
- Role: content and landing-page generation, research capture
- Why shortlisted: AI-powered SEO auditing tool that gives Claude specialized SEO analysis skills. Directly relevant for the targeted destination SEO booking hypothesis. Could audit and improve landing pages for high-intent travel search terms.
- Horizon: now
- Key upside: Directly addresses the SEO experimentation need. Integrates with existing AI workflows. Provides structured SEO feedback that can inform content strategy.
- Key downside: Auditing only, not generation. Does not create pages or manage experiments. Scope may be narrower than needed for a programmatic SEO pipeline.
- Verdict: likely now

### json-render

- URL: https://github.com/vercel-labs/json-render
- Role: content and landing-page generation
- Why shortlisted: Library for AI-generated UIs that constrains model output to predefined component schemas using JSON. Could enable programmatic generation of landing pages where AI produces structured content within controlled design templates rather than freeform HTML.
- Horizon: now
- Key upside: Constrains AI output to predefined safe patterns, reducing risk of broken or off-brand pages. Component-based approach supports systematic variation for experiments. Clean separation between content and presentation.
- Key downside: Vercel ecosystem coupling. May be too UI-focused for the initial content generation needs (which may be more about text, structure, and SEO than interactive components).
- Verdict: assess further

### vinext

- URL: https://github.com/cloudflare/vinext
- Role: site deployment and hosting, content and landing-page generation
- Why shortlisted: Cloudflare's Vite plugin that reimplements the Next.js API surface. 4.4x faster builds, 57% smaller bundles, deployable on Cloudflare edge. Provides a modern, fast publishing surface for landing pages and experiments without heavy Next.js infrastructure.
- Horizon: now
- Key upside: Edge deployment is fast and cheap. Smaller bundles improve page speed (SEO signal). Compatible with familiar Next.js patterns. One-engineer project demonstrates simplicity.
- Key downside: Early-stage project (built in a week). Reimplements Next.js surface but may not cover all patterns needed. Cloudflare coupling, though Cloudflare is a reasonable infrastructure choice.
- Verdict: assess further

---

## Observability and Reporting

### agentlytics

- URL: https://github.com/f/agentlytics
- Role: observability and reporting
- Why shortlisted: Local analytics dashboard for AI agent usage metrics. While currently focused on coding assistants, the pattern of instrumenting and visualizing agent activity is directly relevant for monitoring autonomous business workflows (research cycles, content generation, experiment monitoring).
- Horizon: later
- Key upside: Demonstrates the right pattern: local-first observability over agent behavior with dashboards for cost, usage, and activity. Could be adapted for business agent monitoring.
- Key downside: Currently scoped to coding assistant metrics (Cursor, Claude Code). Would need significant reworking for business workflow observability.
- Verdict: likely later

### kibitz

- URL: https://github.com/kibitzsh/kibitz
- Role: observability and reporting
- Why shortlisted: Converts raw AI terminal output into readable narratives and coordinates multiple sessions. The narrative generation pattern is useful for making autonomous agent activity legible to human operators reviewing what the system did overnight.
- Horizon: later
- Key upside: Addresses the "what did the agents do?" question directly. Narrative output is more reviewable than raw logs. Multi-session coordination supports parallel agent supervision.
- Key downside: Terminal-focused. May not integrate cleanly with non-terminal agent workflows. Unclear depth of structured reporting.
- Verdict: assess further

---

## Agent Coordination and Multi-Agent Supervision

### openfang

- URL: https://github.com/RightNow-AI/openfang
- Role: agent coordination, research capture, data enrichment
- Why shortlisted: Described as an "Agent OS" for autonomous workers that run continuous tasks like research, scraping, and lead generation. This is the closest match in the repo pool to the company's need for autonomous opportunity sensing, market research, and data gathering agents.
- Horizon: now
- Key upside: Explicitly built for continuous autonomous tasks including research and scraping. The "agent OS" framing suggests infrastructure for managing long-running agent processes. Directly relevant to the exploration loop.
- Key downside: Maturity and architecture unclear from description alone. "Agent OS" may be aspirational rather than production-ready. Risk of becoming a heavy dependency if it tries to do too much.
- Verdict: assess further

### Conductor

- URL: https://github.com/Ibrahim-3d/conductor-orchestrator-superpowers
- Role: agent coordination and multi-agent supervision
- Why shortlisted: Orchestrates multiple specialized AI sub-agents for different task types (planning, execution, review). The pattern of specialized sub-agents with a coordinator maps to the company need for research agents, content agents, monitoring agents, and a supervisory layer.
- Horizon: later
- Key upside: Explicit separation between planning, execution, and review agents. This matches the two-loop (exploration/exploitation) structure in the doctrine. Could provide the coordination pattern for autonomous business operations.
- Key downside: Originally designed for coding workflows. Specialization toward planning/coding/review may not translate directly to research/experiment/publish workflows. Plugin architecture may introduce coupling.
- Verdict: assess further

### Klaw

- URL: https://github.com/klawsh/klaw.sh
- Role: agent coordination and multi-agent supervision
- Why shortlisted: Described as "Kubernetes for AI agents" for orchestrating multi-agent deployments. The container-orchestration metaphor suggests systematic agent lifecycle management (deploy, scale, monitor, terminate) which becomes important as the company runs more autonomous workflows.
- Horizon: defer
- Key upside: If the metaphor holds, provides systematic agent lifecycle management. Declarative agent deployment could support bounded autonomy with clear boundaries.
- Key downside: Heavy metaphor for the early stage. The company does not yet have enough agents to need Kubernetes-style orchestration. High risk of premature complexity.
- Verdict: likely later

---

## Data Enrichment and Scraping

### Rodney

- URL: https://github.com/simonw/rodney
- Role: data enrichment and scraping
- Why shortlisted: CLI tool for browser automation using headless Chrome with commands for navigation, scraping, and screenshots. Built by Simon Willison, suggesting quality and maintainability. Directly useful for market research, competitor monitoring, and destination data gathering.
- Horizon: now
- Key upside: Simple CLI interface. Headless Chrome handles JavaScript-rendered pages. From a trusted developer. Can be composed into larger research workflows via shell scripting or orchestration.
- Key downside: CLI-only, not a framework. No built-in scheduling or result storage. Would need to be wrapped in orchestration for recurring research tasks.
- Verdict: likely now

### pinchtab

- URL: https://github.com/pinchtab/pinchtab
- Role: data enrichment and scraping
- Why shortlisted: Standalone HTTP server that lets any AI agent control a Chrome browser through an API with structured DOM access and bot-detection bypass. Enables agent-driven web research where autonomous agents can browse, extract, and analyze web content programmatically.
- Horizon: now
- Key upside: HTTP API means any agent or workflow can use it. Structured DOM access reduces the need for brittle selectors. Bot-detection bypass is important for travel industry sites. Appeared in both bookmarked and daily trending (signal of quality).
- Key downside: Bot-detection bypass may create compliance concerns. Browser-as-a-service adds operational complexity. Security surface of running a browser server.
- Verdict: assess further

### agent-browser

- URL: https://github.com/vercel-labs/agent-browser
- Role: data enrichment and scraping
- Why shortlisted: CLI browser for AI agents that strips DOM noise and reduces token usage while still enabling web navigation. Token-efficient browsing means agents can research more pages within cost budgets. Useful for autonomous market research and competitor analysis.
- Horizon: now
- Key upside: Token efficiency directly reduces the cost of agent-driven research. DOM noise reduction means cleaner data extraction. Vercel Labs origin suggests reasonable quality.
- Key downside: May strip too aggressively for some extraction needs. CLI-only. Less control than full browser automation.
- Verdict: assess further

### text2geo

- URL: https://github.com/charonviz/text2geo
- Role: data enrichment, research capture
- Why shortlisted: Offline fuzzy geocoder that converts place names into GPS coordinates. Directly relevant for a travel business that needs to map destinations, neighborhoods, landmarks, and proximity queries to geographic coordinates for hotel search and content generation.
- Horizon: now
- Key upside: Offline operation means no API costs or rate limits. Fuzzy matching handles the messy place names that appear in travel contexts. Small, focused tool that does one thing well.
- Key downside: Accuracy of offline geocoding may be lower than API-based services (Google, Mapbox). May not cover all destination markets equally well.
- Verdict: likely now

### kreuzberg

- URL: https://github.com/kreuzberg-dev/kreuzberg
- Role: data enrichment
- Why shortlisted: Local document processing toolkit supporting 57 file formats with OCR, table extraction, and PDF handling. Useful for processing travel industry documents, competitor brochures, market reports, and structured data extraction from PDFs.
- Horizon: later
- Key upside: Extremely broad format support. Local processing means no data leaves the system. OCR and table extraction are valuable for structured data from unstructured sources.
- Key downside: Heavy toolkit that may be overkill for early-stage needs. Most early research will come from web scraping, not document processing.
- Verdict: likely later

---

## Internal Tooling and Operator Workflow

### planning-with-files

- URL: https://github.com/OthmanAdi/planning-with-files
- Role: internal tooling, decision logging
- Why shortlisted: Workflow pattern using Markdown files as persistent working memory to track progress and planning across tasks. The pattern of structured markdown files as durable state is directly applicable to decision logging, experiment tracking, and portfolio state management.
- Horizon: now
- Key upside: Zero infrastructure. Markdown files are human-readable, version-controllable, and inspectable. The pattern can be adopted immediately without any tooling dependency.
- Key downside: Not a tool, but a workflow pattern. No schema enforcement, no querying, no automation. Becomes unwieldy as the number of tracked items grows.
- Verdict: likely now

### Crust

- URL: https://github.com/BakeLens/crust
- Role: authentication, permissions, and operational safety
- Why shortlisted: Security gateway that intercepts and filters dangerous tool calls from AI agents. As the company increases autonomous agent activity, a safety layer that prevents agents from executing harmful actions (irreversible deletions, unauthorized publishing, cost overruns) becomes essential.
- Horizon: later
- Key upside: Addresses the doctrine's requirement for configurable autonomy boundaries. Intercept-and-filter pattern is exactly what bounded autonomy needs. Could enforce approval gates for high-risk agent actions.
- Key downside: Designed for AI coding agents, not business workflow agents. Would need adaptation for travel-domain risk patterns (e.g., preventing unauthorized booking commits, rate changes, or mass content deletions).
- Verdict: assess further

---

## Summary

Total shortlisted repos: 19

| Role | Count | Strongest candidates |
|------|-------|---------------------|
| Orchestration and workflow execution | 4 | Antfarm, Fynt |
| Structured knowledge and portfolio state | 3 | engram, memsearch |
| Content and landing-page generation | 3 | claude-seo, vinext |
| Observability and reporting | 2 | kibitz, agentlytics |
| Agent coordination | 3 | openfang, Conductor |
| Data enrichment and scraping | 5 | Rodney, text2geo, agent-browser |
| Internal tooling and operator workflow | 2 | planning-with-files |

Repos marked "likely now": Antfarm, claude-seo, Rodney, text2geo, planning-with-files

Repos marked "assess further": Fynt, gh-aw, takt, engram, memsearch, json-render, vinext, kibitz, openfang, Conductor, pinchtab, agent-browser, Crust

Repos marked "likely later": edgequake, agentlytics, Klaw, kreuzberg
