# GitHub Repo Candidate Registry v0

## Purpose

This registry captures every GitHub repository extracted from the trending and bookmarked source files, evaluated against the company's operating doctrine, venture thesis, and stack thesis. Each repo is classified by fit, horizon, risk, and stack role.

The company is building a travel booking business with increasing autonomy. Repos are judged on whether they improve the ability to research markets, manage experiments, publish content, integrate booking, track analytics, orchestrate workflows, or observe system behavior — without creating stack sprawl.

## Summary

| Label | Count |
|---|---|
| Direct fit | 6 |
| Adjacent fit | 19 |
| Idea source only | 16 |
| Not relevant | ~278 |
| **Total unique repos** | **~319** |

Source files: bookmarked-repos.md, daily-21 through daily-26, monthly-4, weekly-22 through weekly-24.

---

## Direct Fit Repos

### text2geo
- URL: https://github.com/charonviz/text2geo
- Description: Offline fuzzy geocoder that converts place names into GPS coordinates
- Source files: daily-25
- Category guess: geospatial / location services
- Stack role(s): search and booking integration, data enrichment and scraping
- Horizon: now
- Fit: direct fit
- Risk: low maintenance risk
- Why it might matter: Directly supports proximity-based and location-aware hotel booking — the company's core use case families. Offline geocoding avoids API costs and rate limits for batch location processing across target destination markets. Essential for mapping user queries like "hotels near Sukhumvit" or "stay near Burj Khalifa" to coordinates.
- Concerns: Fuzzy matching accuracy for international place names, transliterated names, and hotel neighborhood conventions. Coverage across target markets (Dubai, Bangkok, London, Bali, etc.) unknown without testing.
- Current verdict: Evaluate immediately for accuracy in target destination markets. If coverage is strong, this is a near-term foundation component.

### claude-seo
- URL: https://github.com/AgriciDaniel/claude-seo
- Description: AI-powered SEO auditing tool that gives Claude Code specialized SEO analysis skills
- Source files: daily-23
- Category guess: SEO / content optimization
- Stack role(s): content and landing-page generation, research capture and market intelligence
- Horizon: now
- Fit: direct fit
- Risk: medium maintenance risk
- Why it might matter: SEO is a primary acquisition channel for targeted destination booking pages. Automated SEO auditing of travel landing pages directly supports the content experimentation loop described in the doctrine. Could audit pages for "hotels near [landmark]" type queries.
- Concerns: Tightly coupled to Claude Code CLI. Breadth and depth of SEO checks unknown — may be too generic for travel-specific SEO patterns. May need supplementing with dedicated SEO APIs or tools.
- Current verdict: Assess whether it provides actionable travel-page SEO insights. If the checks are substantial, integrate into the content publishing workflow.

### mapcn
- URL: https://github.com/AnmolSaini16/mapcn
- Description: Map library built on MapLibre GL that adds interactive maps to web apps with simple setup
- Source files: monthly-4
- Category guess: mapping / UI component
- Stack role(s): search and booking integration, content and landing-page generation
- Horizon: now
- Fit: direct fit
- Risk: low maintenance risk
- Why it might matter: Interactive maps are essential for proximity-based hotel booking — showing hotel locations relative to landmarks, venues, districts, and neighborhoods. MapLibre GL is open-source and vendor-neutral, avoiding Google Maps lock-in. Simple setup accelerates experiment velocity.
- Concerns: May be too thin a wrapper — direct MapLibre GL usage might be preferable for custom booking map behavior. Need to verify feature coverage for marker clustering, custom popups, search radius visualization, and mobile responsiveness.
- Current verdict: Strong candidate for the booking product map layer. Compare with raw MapLibre GL to determine if the abstraction helps or constrains.

### Rodney
- URL: https://github.com/simonw/rodney
- Description: CLI tool for browser automation using headless Chrome with commands for navigation, scraping, screenshots
- Source files: daily-23
- Category guess: browser automation / web scraping
- Stack role(s): data enrichment and scraping
- Horizon: now
- Fit: direct fit
- Risk: low maintenance risk
- Why it might matter: From Simon Willison (respected, prolific open-source developer). Enables autonomous competitor research, hotel pricing scraping, destination content extraction, and market intelligence gathering. Clean CLI interface fits well with autonomous workflow orchestration — agents can invoke Rodney commands to gather structured web data.
- Concerns: Headless Chrome anti-bot detection may block some travel aggregator sites. Scope of built-in commands unknown. May need pairing with proxy rotation for production scraping.
- Current verdict: Leading candidate for browser-based research automation. Evaluate alongside agent-browser and pinchtab for different scraping scenarios.

### Uptimer
- URL: https://github.com/VrianCao/Uptimer
- Description: Serverless uptime monitoring with status page using Cloudflare Workers
- Source files: weekly-24
- Category guess: monitoring / observability
- Stack role(s): observability and reporting
- Horizon: now
- Fit: direct fit
- Risk: low maintenance risk
- Why it might matter: Travel booking pages must be reliable — downtime during a user's urgent booking intent is a lost conversion. Serverless monitoring on Cloudflare Workers is low-cost and fits a Cloudflare-oriented deployment strategy. Built-in status page provides transparency.
- Concerns: Feature depth (alerting integrations, response time tracking, multi-region checks, SSL monitoring) unclear. May need supplementing for deeper application-level observability.
- Current verdict: Good lightweight monitoring candidate for the early stack. Assess feature coverage and alerting capabilities.

### vinext
- URL: https://github.com/cloudflare/vinext
- Description: Cloudflare's Vite plugin reimplementing the Next.js API surface — 4.4x faster builds, 57% smaller bundles, deployable anywhere
- Source files: bookmarked
- Category guess: deployment framework / hosting
- Stack role(s): site deployment and hosting
- Horizon: now
- Fit: direct fit
- Risk: medium maintenance risk
- Why it might matter: If the company builds with Next.js patterns, vinext offers dramatically faster builds and smaller bundles on Cloudflare infrastructure. This directly accelerates the content experimentation loop — faster deploys mean faster landing page experiments. Edge deployment improves load times for international travel audiences.
- Concerns: Very new project — reportedly built by one Cloudflare engineer with AI in a week. Maturity uncertain. May not support all Next.js features or edge cases. Risk of breaking changes or abandonment.
- Current verdict: High-potential deployment candidate if Cloudflare infrastructure is chosen. Assess maturity, Next.js API coverage, and community traction before committing.

---

## Adjacent Fit Repos

### Fynt
- URL: https://github.com/abhinavkale-dev/fynt
- Description: Self-hostable workflow automation platform similar to Zapier or n8n with a visual node editor
- Source files: daily-24
- Category guess: workflow automation
- Stack role(s): orchestration and workflow execution
- Horizon: now
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Could orchestrate recurring research, content publishing, and monitoring workflows. Self-hostable avoids vendor lock-in. Visual editor could lower the barrier for defining new experiment workflows. The doctrine calls for lightweight orchestration — this could fill that role.
- Concerns: Maturity and stability compared to established alternatives like n8n. Self-hosting adds operational burden. Feature depth for LLM-agent-specific workflows unknown.
- Current verdict: Compare with n8n and Antfarm. Evaluate if the visual editor and self-hosting model justify adoption over more mature alternatives.

### Antfarm
- URL: https://github.com/snarktank/antfarm
- Description: Multi-agent workflow system using simple YAML, SQLite, and cron scheduling
- Source files: weekly-23
- Category guess: lightweight orchestration
- Stack role(s): orchestration and workflow execution
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: Extremely simple stack (YAML, SQLite, cron) aligns with the doctrine's preference for simple, modular, replaceable components. Could coordinate scheduled research tasks, content audits, and monitoring jobs without heavy infrastructure. Low coupling means easy replacement.
- Concerns: May be too simple for complex multi-step workflows as the business matures. Limited community and documentation likely.
- Current verdict: Promising for early-stage orchestration. The simplicity is a strength — evaluate whether YAML workflow definitions are expressive enough for the research and experiment loops.

### takt
- URL: https://github.com/nrslib/takt
- Description: Workflow orchestrator coordinating multiple LLM agents for coding tasks and automation
- Source files: daily-21
- Category guess: agent orchestration
- Stack role(s): orchestration and workflow execution
- Horizon: now
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Designed specifically for coordinating LLM agents on multi-step tasks. Could orchestrate market research agents, content generation agents, and monitoring agents in sequence or parallel.
- Concerns: Originally designed for coding tasks — may need adaptation for business research workflows. Maturity unknown.
- Current verdict: Evaluate whether the orchestration model generalizes beyond coding tasks to research and content workflows.

### symphony-ts
- URL: https://github.com/OasAIStudio/symphony-ts
- Description: TypeScript port of Symphony autonomous agent orchestration framework, originally written in Elixir
- Source files: daily-26
- Category guess: agent orchestration framework
- Stack role(s): orchestration and workflow execution, agent coordination and multi-agent supervision
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: TypeScript port of an established orchestration framework. Could provide more sophisticated agent coordination as the autonomous system matures beyond simple cron-based workflows.
- Concerns: Port from Elixir may lose idiomatic qualities. Maturity of TypeScript version unknown. May be over-engineered for the early stack.
- Current verdict: Watch for later horizons. Evaluate when the company needs more sophisticated orchestration than YAML/cron can provide.

### GitHub Agentic Workflows
- URL: https://github.com/github/gh-aw
- Description: Framework to run AI agents as scheduled GitHub workflows defined in markdown
- Source files: daily-23
- Category guess: CI/CD-based agent orchestration
- Stack role(s): orchestration and workflow execution
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: Leverages GitHub Actions infrastructure the company likely already uses. Markdown-defined workflows align with the doctrine's preference for human-readable state. Could run scheduled market research, competitor monitoring, and content auditing tasks with zero additional infrastructure.
- Concerns: GitHub Actions has execution time limits and cost implications at scale. May not suit real-time or high-frequency workflows. Vendor lock-in to GitHub.
- Current verdict: Attractive for early lightweight orchestration. Evaluate cost at expected workflow frequency and whether markdown workflow definitions are expressive enough.

### agent-browser
- URL: https://github.com/vercel-labs/agent-browser
- Description: CLI browser for AI agents that strips DOM noise and reduces token usage while still enabling web navigation
- Source files: monthly-4
- Category guess: agent web browsing
- Stack role(s): data enrichment and scraping
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: From Vercel Labs. Designed specifically for AI agents browsing the web — strips noise to reduce token costs. Could power autonomous market research agents that browse competitor sites, travel forums, and destination resources without wasting context on irrelevant DOM elements.
- Concerns: Token reduction approach may strip useful content from travel sites. Feature coverage for interaction (forms, pagination) unclear.
- Current verdict: Compare with Rodney and pinchtab. Evaluate whether the token-efficient approach works well for travel content extraction.

### pinchtab
- URL: https://github.com/pinchtab/pinchtab
- Description: Standalone HTTP server that lets any AI agent control a Chrome browser through an API with structured DOM access and bot-detection bypass
- Source files: bookmarked, daily-24
- Category guess: browser automation API
- Stack role(s): data enrichment and scraping
- Horizon: now
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Bot-detection bypass is particularly relevant for scraping travel aggregator and hotel booking sites that actively block automation. HTTP API interface means any agent system can use it, not just CLI-based tools. Structured DOM access could enable precise extraction of hotel prices, availability, and reviews.
- Concerns: Bot-detection bypass capabilities may degrade as sites update countermeasures. Standalone server adds a dependency. Legal and ethical considerations for scraping commercial travel sites.
- Current verdict: Potentially valuable for scraping travel sites that block standard headless Chrome. Evaluate bot-detection bypass reliability on target travel sites.

### x-research-skill
- URL: https://github.com/rohunvora/x-research-skill
- Description: MCP skill that lets Claude search and analyze discussions on X (Twitter) and synthesize results into reports
- Source files: daily-22
- Category guess: social media intelligence
- Stack role(s): research capture and market intelligence
- Horizon: now
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Travel sentiment, trending destinations, and customer complaints about booking experiences are discussed on X. Automated monitoring and synthesis could feed the opportunity research loop with real-time market signals.
- Concerns: X/Twitter API access and costs. Platform policy changes could break functionality. Signal-to-noise ratio for travel-specific intelligence may be low.
- Current verdict: Evaluate X API costs and the quality of travel-specific signal extraction before committing.

### memsearch
- URL: https://github.com/zilliztech/memsearch
- Description: File-based memory system for AI agents using markdown as the source of truth with vector indexing
- Source files: daily-23
- Category guess: agent memory / knowledge store
- Stack role(s): structured knowledge and portfolio state
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: Markdown as source of truth directly aligns with the doctrine's insistence on human-readable state. Could store portfolio state, research findings, experiment records, and decision history in a format that is both machine-queryable (via vector indexing) and human-inspectable. From Zilliz (vector database company).
- Concerns: May not scale well for complex relational portfolio state. Vector indexing adds a layer that could drift from the markdown ground truth. Unclear if it supports structured querying beyond similarity search.
- Current verdict: Strong candidate for lightweight portfolio state if markdown-first design fits. Evaluate whether vector search is sufficient for the structured queries the portfolio model requires.

### engram
- URL: https://github.com/Gentleman-Programming/engram
- Description: Persistent memory layer for AI coding agents using Go, SQLite, and FTS5 for full-text search across sessions
- Source files: daily-26, weekly-24
- Category guess: agent memory / state persistence
- Stack role(s): structured knowledge and portfolio state
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: SQLite + FTS5 is simple, self-contained, and aligns with the doctrine's preference for clear state without magic. Could persist market research findings, experiment outcomes, and portfolio decisions in a searchable, durable store. No external database dependency.
- Concerns: Originally designed for coding agent memory, not business portfolio state. May need schema adaptation. SQLite has concurrency limitations for multi-agent write scenarios.
- Current verdict: Evaluate whether the memory model generalizes beyond coding contexts. If so, the simplicity of SQLite + FTS5 is a strong advantage for the early stack.

### edgequake
- URL: https://github.com/raphaelmansuy/edgequake
- Description: Rust implementation of GraphRAG that builds knowledge graphs from documents for better AI retrieval
- Source files: daily-25
- Category guess: knowledge graph / RAG
- Stack role(s): structured knowledge and portfolio state
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Knowledge graphs could structure the relationships between destinations, hotels, demand patterns, competitor positions, and opportunity hypotheses — providing richer retrieval than flat vector search. GraphRAG combines knowledge graph structure with retrieval-augmented generation.
- Concerns: Adds complexity beyond what the early stack needs. Rust implementation may be harder to integrate and customize. Building a useful knowledge graph requires substantial data curation. Overkill for the early phase.
- Current verdict: Interesting for later horizons when the research corpus is large enough to benefit from graph structure. Defer until flat search proves insufficient.

### discrawl
- URL: https://github.com/steipete/discrawl
- Description: CLI tool that mirrors Discord servers into a searchable local SQLite database with optional embedding-based search
- Source files: daily-26
- Category guess: community intelligence / data capture
- Stack role(s): data enrichment and scraping, research capture and market intelligence
- Horizon: later
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: Travel and hospitality communities on Discord could provide market intelligence — trending destinations, customer complaints, pricing discussions, and demand signals. Mirroring to SQLite enables structured analysis. Embedding-based search allows semantic querying.
- Concerns: Travel-specific Discord communities may be limited or low-signal. Discord ToS considerations. Requires identifying the right servers to monitor.
- Current verdict: Useful if high-value travel Discord communities exist. Evaluate which communities would provide actionable intelligence before investing in setup.

### kreuzberg
- URL: https://github.com/kreuzberg-dev/kreuzberg
- Description: Local document processing toolkit supporting 57 file formats with OCR, table extraction, and PDF handling
- Source files: monthly-4
- Category guess: document processing / data extraction
- Stack role(s): data enrichment and scraping
- Horizon: later
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: Could process travel industry reports, hotel PDFs, tourism board documents, and regulatory filings to extract structured data for market research. Runs locally — no external API costs.
- Concerns: Travel-specific document processing needs are unclear in the early phase. Adds a dependency that may not be needed until the research pipeline is more mature.
- Current verdict: Keep in view for when document processing becomes a bottleneck in the research pipeline. Not needed immediately.

### openfang
- URL: https://github.com/RightNow-AI/openfang
- Description: "Agent OS" for autonomous workers that run continuous tasks like research, scraping, and lead generation
- Source files: daily-25
- Category guess: autonomous agent platform
- Stack role(s): agent coordination and multi-agent supervision, data enrichment and scraping
- Horizon: later
- Fit: adjacent fit
- Risk: high maintenance risk
- Why it might matter: The description maps closely to the company's autonomous ambition — continuous research, scraping, and lead generation are central to the exploration loop. An "Agent OS" could provide the runtime for always-on market sensing.
- Concerns: "Agent OS" typically means heavy, opinionated infrastructure. Conflicts with the doctrine's warning against orchestration systems more complicated than the workflows they manage. Maturity and stability unknown. High risk of infrastructure bloat.
- Current verdict: Treat as a later-stage candidate only. The architecture pattern is relevant but the implementation may be too heavy for the early stack.

### json-render
- URL: https://github.com/vercel-labs/json-render
- Description: Library for AI-generated UIs that constrains model output to predefined components using JSON schemas
- Source files: monthly-4
- Category guess: dynamic UI generation
- Stack role(s): content and landing-page generation
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Could enable AI agents to dynamically generate travel landing pages from structured data — given a destination, hotel set, and positioning angle, the system could produce a page using predefined booking UI components. Constraining output to schemas reduces hallucination risk.
- Concerns: Vercel Labs project — may be experimental. Travel landing pages need careful UX design that may not benefit from AI generation. The constraint model may be too rigid for nuanced travel page layouts.
- Current verdict: Interesting for later-stage content automation. Evaluate whether AI-generated pages are viable for travel booking contexts where trust and clarity are essential.

### Trellis
- URL: https://github.com/mindfold-ai/Trellis
- Description: AI project management and task coordination platform
- Source files: monthly-4
- Category guess: project management / experiment tracking
- Stack role(s): experiment registry and comparison, internal tooling and operator workflow
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Could serve as the experiment registry and comparison layer — managing active hypotheses, live experiments, and their outcomes as structured tasks. AI-native project management aligns with the autonomous ambition.
- Concerns: Generic project management may not fit the specific portfolio model's needs (hypothesis comparison, promotion criteria, kill decisions). Maturity unknown.
- Current verdict: Evaluate whether the task model can represent the portfolio lifecycle (research → hypothesis → experiment → wedge). If it can, it fills an important gap.

### agent-vault
- URL: https://github.com/botiverse/agent-vault
- Description: Secret-aware file layer that protects API keys when AI agents read or write configuration files
- Source files: daily-24
- Category guess: agent security / secret management
- Stack role(s): authentication, permissions, and operational safety
- Horizon: now
- Fit: adjacent fit
- Risk: low maintenance risk
- Why it might matter: As autonomous agents interact with LiteAPI, analytics services, and deployment tools, API key protection becomes critical. Agent-vault prevents accidental key exposure during agent file operations — a real operational safety concern.
- Concerns: Scope may be narrow (file-level protection only). May not cover all secret exposure vectors in agent workflows (logs, error messages, API responses).
- Current verdict: Lightweight and focused. Evaluate whether it covers the key exposure scenarios relevant to the company's agent workflows.

### Crust
- URL: https://github.com/BakeLens/crust
- Description: Security gateway that intercepts and filters dangerous tool calls from AI agents
- Source files: daily-22
- Category guess: agent safety / governance
- Stack role(s): authentication, permissions, and operational safety
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: As autonomous agents gain the ability to publish content, modify booking configurations, or alter live experiments, a safety gateway that filters dangerous actions aligns with the doctrine's requirement for configurable approval gates and bounded autonomy.
- Concerns: Maturity unknown. May be over-engineered for the early stack. The filtering rules need to be well-designed to avoid blocking legitimate agent actions.
- Current verdict: Important conceptually for controlled autonomy. Evaluate when autonomous agents begin executing actions with material business impact.

### dash
- URL: https://github.com/agno-agi/dash
- Description: Self-learning AI data analyst agent that understands schemas, remembers past queries, and improves over time
- Source files: bookmarked, daily-21, monthly-4
- Category guess: AI data analysis
- Stack role(s): analytics and event tracking, research capture and market intelligence
- Horizon: later
- Fit: adjacent fit
- Risk: medium maintenance risk
- Why it might matter: Could serve as an autonomous analytics agent — querying booking data, analyzing conversion funnels, comparing experiment outcomes, and surfacing insights without manual SQL or dashboard work. Self-learning behavior means it improves as data accumulates.
- Concerns: Three appearances in trending suggests hype. Self-learning behavior may produce unreliable insights without human oversight. Schema understanding needs to work with the company's actual data model. Not travel-specific.
- Current verdict: Interesting for later horizons when booking and analytics data exists in sufficient volume. Not useful until the data layer is established.

---

## Idea Source Only Repos

### financial-services-plugins
- URL: https://github.com/anthropics/financial-services-plugins
- Description: Anthropic's official Claude plugins for financial services with MCP connectors for FactSet and MSCI data
- Source files: bookmarked
- Category guess: domain-specific MCP plugins
- Stack role(s): research capture and market intelligence (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: low maintenance risk
- Why it might matter: The architecture pattern — domain-specific MCP plugins connecting AI to structured data sources — could inspire equivalent travel industry plugins. Imagine MCP connectors for LiteAPI, hotel review APIs, tourism statistics, or destination data services.
- Concerns: Financial services domain; not directly usable for travel.
- Current verdict: Study the plugin architecture for MCP design patterns. Do not adopt the financial plugins themselves.

### autoresearch
- URL: https://github.com/karpathy/autoresearch
- Description: Autonomous AI research framework by Karpathy that iteratively modifies model architectures and evaluates results automatically
- Source files: bookmarked, daily-26
- Category guess: autonomous research loop
- Stack role(s): research capture and market intelligence (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: The pattern of iterative autonomous research — hypothesize, test, evaluate, refine — directly mirrors what the company wants its market research loop to do. The architecture of "modify → evaluate → iterate" is conceptually transferable from ML research to market/booking research.
- Concerns: Designed for ML model architecture search, not business research. The specific implementation is not applicable.
- Current verdict: Study for the iterative research loop pattern. The business needs its own version of this for market and opportunity research.

### OpenPlanter
- URL: https://github.com/ShinMegamiBoson/OpenPlanter
- Description: Recursive investigation agent that analyzes corporate registries, lobbying records, contracts, and campaign finance data
- Source files: daily-24
- Category guess: recursive investigation agent
- Stack role(s): research capture and market intelligence (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: high maintenance risk
- Why it might matter: The recursive investigation pattern — start with a lead, follow connections, build a graph of relationships — could inspire travel market investigation agents that map hotel supply chains, competitor relationships, or destination ecosystem structures.
- Concerns: Designed for corporate/political investigation, not travel. Very domain-specific implementation.
- Current verdict: Study the recursive investigation architecture for potential adaptation to travel market research.

### hive
- URL: https://github.com/adenhq/hive
- Description: Self-evolving AI agent framework where failures trigger automated code improvement loops
- Source files: monthly-4
- Category guess: self-improving agent system
- Stack role(s): agent coordination and multi-agent supervision (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: high maintenance risk
- Why it might matter: The concept of agents that improve from failure aligns with the company's long-term autonomy ambition. A market research agent that gets better at finding opportunities after each failed experiment could compound advantage.
- Concerns: Self-evolving code is high-risk and hard to audit. Conflicts with the doctrine's requirement for clear, human-readable state and explainable agent actions. Premature for the early stack.
- Current verdict: Conceptually interesting for far-future autonomy. Too risky and uncontrolled for near-term adoption.

### OneContext
- URL: https://github.com/TheAgentContextLab/OneContext
- Description: Shared context layer for AI agents so teams can resume work from the exact state of previous runs
- Source files: daily-22
- Category guess: agent state management
- Stack role(s): structured knowledge and portfolio state (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: The idea of shared, resumable context across agent sessions supports the portfolio state requirement — different agents working on different research tracks should share a common understanding of what has been learned.
- Concerns: Designed for developer teams using AI coding agents. Not adapted for business research contexts.
- Current verdict: Study the shared context architecture for potential application to portfolio state management.

### OpenViking
- URL: https://github.com/volcengine/OpenViking
- Description: ByteDance research project that stores AI agent memory as a hierarchical filesystem rather than a flat vector database
- Source files: weekly-22
- Category guess: hierarchical agent memory
- Stack role(s): structured knowledge and portfolio state (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: The hierarchical filesystem approach to agent memory is philosophically aligned with the doctrine's preference for human-readable, inspectable state over opaque databases. Portfolio state organized as folders and files would be directly browsable.
- Concerns: ByteDance research project — may not be production-ready. Hierarchical filesystem may not handle relational portfolio queries well.
- Current verdict: Study the design philosophy. The human-readable-first memory approach is worth considering for portfolio state design.

### planning-with-files
- URL: https://github.com/OthmanAdi/planning-with-files
- Description: A Claude Code workflow using Markdown files as persistent working memory to track progress and planning across tasks
- Source files: monthly-4
- Category guess: markdown-based state management
- Stack role(s): structured knowledge and portfolio state (pattern), decision logging and review (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: low maintenance risk
- Why it might matter: Markdown files as persistent working memory is a pattern directly applicable to the portfolio model — research tracks, experiment state, and decision history stored as inspectable, version-controlled markdown files.
- Concerns: Designed for individual Claude Code workflows, not multi-agent business systems.
- Current verdict: The pattern of markdown-as-state is valuable and should inform how portfolio state is structured, regardless of whether this specific repo is used.

### HermitClaw
- URL: https://github.com/brendanhogan/hermitclaw
- Description: Autonomous research agent that self-selects topics and writes reports
- Source files: weekly-24
- Category guess: autonomous research
- Stack role(s): research capture and market intelligence (pattern), agent coordination (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: high maintenance risk
- Why it might matter: Self-directed research agents are the long-term vision for the exploration loop. A system that autonomously identifies what to research, executes research, and produces structured reports maps directly to the opportunity sensing function.
- Concerns: Self-selecting topics without strategic guardrails could produce unfocused, low-value research. Conflicts with the doctrine's warning against agent sprawl without clear jobs.
- Current verdict: Study the architecture for self-directed research. The company's version must operate within explicit strategic boundaries, not unlimited topic exploration.

### Ars Contexta
- URL: https://github.com/agenticnotetaking/arscontexta
- Description: Generates a knowledge graph ("Skill Graph") to give AI agents structured context
- Source files: weekly-24
- Category guess: agent knowledge graph
- Stack role(s): structured knowledge and portfolio state (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: A structured knowledge graph giving agents context about the business — current hypotheses, active experiments, known competitors, destination data — could improve agent decision quality across all research and execution tasks.
- Concerns: Generic design, not travel-specific. May add complexity without proportional benefit in the early phase.
- Current verdict: Study for knowledge graph design patterns. The concept of structured context for business agents is important even if this specific implementation is not adopted.

### nWave
- URL: https://github.com/nWave-ai/nWave
- Description: Agentic software development framework enforcing a six-stage development cycle
- Source files: weekly-24
- Category guess: structured agent lifecycle
- Stack role(s): orchestration and workflow execution (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: The idea of enforcing a structured lifecycle for agent work — stages, gates, reviews — maps to the portfolio model's requirement for experiments to move through defined stages (research → hypothesis → experiment → wedge) with explicit promotion criteria.
- Concerns: Designed for software development, not business operations. The six-stage model may not map to the portfolio lifecycle.
- Current verdict: Study the stage-gate architecture for potential adaptation to the experiment and portfolio lifecycle.

### Skyll
- URL: https://github.com/assafelovic/skyll
- Description: API that allows AI agents to dynamically retrieve "skill files" (SKILL.md) at runtime instead of pre-installing them
- Source files: weekly-22
- Category guess: dynamic agent capabilities
- Stack role(s): agent coordination and multi-agent supervision (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: Dynamic skill retrieval could enable agents to pick up new capabilities (e.g., a new data source connector, a new analysis method) without redeployment. This supports the modular, replaceable architecture the doctrine requires.
- Concerns: Runtime skill loading adds unpredictability. Skill quality and security are concerns.
- Current verdict: Study for modular agent capability design. The concept of composable, runtime skills is architecturally interesting.

### Claude Ads
- URL: https://github.com/AgriciDaniel/claude-ads
- Description: Terminal tool that audits Google and Meta ad accounts with 180+ checks
- Source files: weekly-24
- Category guess: advertising audit
- Stack role(s): analytics and event tracking (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: If the company runs paid acquisition campaigns to drive traffic to booking pages, automated ad account auditing could catch waste, inefficiency, and misconfiguration. The pattern of 180+ automated checks is inspiring for any monitoring domain.
- Concerns: Tightly coupled to Claude Code CLI. May not be useful until paid acquisition is a meaningful channel.
- Current verdict: Keep in view for when paid advertising becomes part of the acquisition strategy. Study the automated audit pattern.

### Login Machine
- URL: https://github.com/RichardHruby/login-machine
- Description: Agent loop that automates website login flows including MFA, SSO, and credential forms
- Source files: daily-23
- Category guess: automated authentication
- Stack role(s): data enrichment and scraping (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: Some competitor sites and data sources behind logins could provide valuable market intelligence. Automated login enables scraping of authenticated content. The pattern of handling MFA and SSO programmatically is non-trivial.
- Concerns: Legal and ethical concerns with automated login to competitor sites. Credentials management risk. May trigger security alerts on target sites.
- Current verdict: Study the approach but be cautious about adoption. Authenticated scraping has significant legal and operational risks.

### ChartGPU
- URL: https://github.com/ChartGPU/ChartGPU
- Description: WebGPU-accelerated charting library capable of visualizing very large datasets smoothly
- Source files: monthly-4
- Category guess: high-performance charting
- Stack role(s): analytics and event tracking (pattern), observability and reporting (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: low maintenance risk
- Why it might matter: If the company accumulates large datasets (booking events, search queries, market data), GPU-accelerated charting could enable smooth visualization of trends, patterns, and anomalies in internal dashboards.
- Concerns: Overkill for the early stack. WebGPU browser support is still maturing. Standard charting libraries are sufficient for early analytics.
- Current verdict: Interesting for later stages when data volumes justify GPU-accelerated visualization.

### Liveline
- URL: https://github.com/benjitaylor/liveline
- Description: Lightweight React animated real-time line chart component
- Source files: weekly-24
- Category guess: real-time charting
- Stack role(s): analytics and event tracking (pattern), observability and reporting (pattern)
- Horizon: defer
- Fit: idea source only
- Risk: low maintenance risk
- Why it might matter: Real-time line charts could visualize live booking conversion rates, traffic trends, or experiment performance on internal dashboards.
- Concerns: Single-component library. May be too narrow to justify as a stack dependency. Many alternatives exist.
- Current verdict: Note as an option for real-time dashboard components. Not a priority for adoption.

### Conductor
- URL: https://github.com/Ibrahim-3d/conductor-orchestrator-superpowers
- Description: Plugin that orchestrates multiple specialized AI sub-agents for tasks like planning, coding, and review
- Source files: daily-24
- Category guess: multi-agent orchestration
- Stack role(s): agent coordination and multi-agent supervision (pattern)
- Horizon: later
- Fit: idea source only
- Risk: medium maintenance risk
- Why it might matter: The pattern of orchestrating specialized sub-agents — one for research, one for content, one for monitoring — maps to the company's vision of coordinated autonomous workflows. The decomposition of complex tasks into specialized agents is architecturally relevant.
- Concerns: Designed for coding tasks (planning, coding, review). May not adapt well to business research and execution workflows. Plugin architecture may create coupling.
- Current verdict: Study the multi-agent orchestration pattern. The concept of specialized sub-agents with an orchestration layer is relevant for the company's autonomous architecture.

---

## Not Relevant Repos

### Claude Code and OpenClaw Ecosystem

| Name | URL | Fit | Reason |
|---|---|---|---|
| claude-code-tips | https://github.com/ykdojo/claude-code-tips | not relevant | Claude Code productivity tips, not a stack component |
| claude-code-controller | https://github.com/The-Vibe-Company/claude-code-controller | not relevant | Claude Code control tool, not business infrastructure |
| ChernyCode | https://github.com/meleantonio/ChernyCode | not relevant | Claude Code configuration tips |
| claude-pulse | https://github.com/NoobyGains/claude-pulse | not relevant | Claude Code usage stats display |
| claude-hud | https://github.com/jarrodwatts/claude-hud | not relevant | Claude Code session insights plugin |
| CodePilot | https://github.com/op7418/CodePilot | not relevant | GUI wrapper around Claude Code |
| Companion | https://github.com/The-Vibe-Company/companion | not relevant | Web UI for Claude Code sessions |
| claude-replay | https://github.com/es617/claude-replay | not relevant | Claude Code log replay visualization |
| claude-forge | https://github.com/sangrokjung/claude-forge | not relevant | Claude Code plugin system |
| claude-context-mode | https://github.com/mksglu/claude-context-mode | not relevant | MCP output caching for Claude |
| Happy | https://github.com/slopus/happy | not relevant | Remote phone control of Claude Code |
| peon-ping | https://github.com/tonyyont/peon-ping | not relevant | Notification sounds for Claude Code |
| Napkin | https://github.com/blader/napkin | not relevant | Claude Code persistent notes |
| Total Recall | https://github.com/davegoldblatt/total-recall | not relevant | Claude Code conversation memory |
| everything-claude-code | https://github.com/affaan-m/everything-claude-code | not relevant | Claude Code configuration suite |
| Pro Workflow | https://github.com/rohitg00/pro-workflow | not relevant | Claude Code learning plugin |
| Taskmaster | https://github.com/blader/taskmaster | not relevant | Claude Code unfinished task hook |
| CtxPort | https://github.com/nicepkg/ctxport | not relevant | AI chat export to markdown |
| Lynkr | https://github.com/Fast-Editor/Lynkr | not relevant | Proxy routing Claude Code to AI providers |
| nanoclaw | https://github.com/gavrielc/nanoclaw | not relevant | Lightweight OpenClaw rewrite |
| ZeroClaw | https://github.com/theonlyhennygod/zeroclaw | not relevant | Rust OpenClaw rewrite |
| IronClaw | https://github.com/nearai/ironclaw | not relevant | Rust-based AI assistant system |
| MimiClaw | https://github.com/memovai/mimiclaw | not relevant | ESP32 microcontroller AI agent |
| TinyClaw | https://github.com/jlia0/tinyclaw | not relevant | Claude Code to WhatsApp bridge |
| SmallClaw | https://github.com/XposeMarket/SmallClaw | not relevant | Lightweight OpenClaw for small models |
| Clawra | https://github.com/SumeLabs/clawra | not relevant | AI character built on OpenClaw |
| OpenClaw Deck | https://github.com/kellyclaudeai/openclaw-deck | not relevant | Multi-column OpenClaw chat UI |
| ClawPal | https://github.com/zhixianio/clawpal | not relevant | Desktop UI for OpenClaw management |
| ClawWork | https://github.com/HKUDS/ClawWork | not relevant | AI agent productivity measurement |
| Clawbox | https://github.com/joshavant/clawbox | not relevant | macOS VM with OpenClaw |
| PicoClaw | https://github.com/sipeed/picoclaw | not relevant | Ultra-lightweight Go AI agent |
| ClawSec | https://github.com/prompt-security/clawsec | not relevant | OpenClaw security suite |
| moltworker | https://github.com/cloudflare/moltworker | not relevant | OpenClaw on Cloudflare Workers |
| awesome-openclaw-skills | https://github.com/VoltAgent/awesome-openclaw-skills | not relevant | Curated OpenClaw skill list |
| awesome-openclaw-usecases | https://github.com/hesamsheikh/awesome-openclaw-usecases | not relevant | OpenClaw use case collection |
| OpenClaw Foundry | https://github.com/lekt9/openclaw-foundry | not relevant | Workflow automation code generation |
| OpenClaw Runbook | https://github.com/digitalknk/openclaw-runbook | not relevant | AI agent operations guide |
| clawport-ui | https://github.com/JohnRiceML/clawport-ui | not relevant | AI agent fleet management UI |
| GitClaw | https://github.com/SawyerHood/gitclaw | not relevant | AI agent via GitHub Actions |
| Claw Compactor | https://github.com/aeromomo/claw-compactor | not relevant | AI context compression tool |
| VisionClaw | https://github.com/sseanliu/VisionClaw | not relevant | Smart glasses AI assistant |
| Ralph Playbook | https://github.com/ClaytonFarr/ralph-playbook | not relevant | Coding agent workflow guide |
| ralph | https://github.com/snarktank/ralph | not relevant | Autonomous AI coding loop |
| open-ralph-wiggum | https://github.com/Th0rgal/open-ralph-wiggum | not relevant | Terminal loop for coding agents |
| TenacitOS | https://github.com/carlosazaustre/tenacitOS | not relevant | OpenClaw monitoring dashboard |
| ComfyUI-OpenClaw | https://github.com/rookiestar28/ComfyUI-OpenClaw | not relevant | ComfyUI automation layer |

### Agent Management and Multi-Agent Coding Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| Agent Deck | https://github.com/asheshgoplani/agent-deck | not relevant | Terminal dashboard for managing coding agents |
| Agent Viewer | https://github.com/hallucinogen/agent-viewer | not relevant | Kanban UI for Claude Code agents |
| Mission Control (weekly-22) | https://github.com/crshdn/mission-control | not relevant | Kanban for coordinating coding agents |
| mission-control (daily-25) | https://github.com/MeisnerDan/mission-control | not relevant | Task manager for AI coding agents |
| Parallel Code | https://github.com/johannesjo/parallel-code | not relevant | Multiple coding agents in Git worktrees |
| 1code | https://github.com/21st-dev/1code | not relevant | Parallel AI coding sessions |
| Maestro | https://github.com/its-maestro-baby/maestro | not relevant | Multiple AI coding sessions app |
| Constellagent | https://github.com/owengretzinger/constellagent | not relevant | macOS workspace for AI coding agents |
| overstory | https://github.com/jayminwest/overstory | not relevant | Parallel agents in Git worktrees |
| Background Agents | https://github.com/ColeMurray/background-agents | not relevant | Background coding agent framework |
| openwork | https://github.com/different-ai/openwork | not relevant | Desktop UI for autonomous coding agents |
| Quoroom | https://github.com/quoroom-ai/room | not relevant | Agent voting collective system |
| walkie | https://github.com/vikasprogrammer/walkie | not relevant | P2P encrypted agent communication |
| agentchattr | https://github.com/bcurts/agentchattr | not relevant | Multi-agent chat platform |
| MoChat | https://github.com/HKUDS/MoChat | not relevant | Messaging platform for AI agents |
| Spacebot | https://github.com/spacedriveapp/spacebot | not relevant | Multi-user AI agent for messaging |
| Memoh | https://github.com/memohai/Memoh | not relevant | Multi-bot container platform |
| Counselors | https://github.com/aarondfrancis/counselors | not relevant | Multi-agent response aggregator for coding |
| aqua | https://github.com/quailyquaily/aqua | not relevant | P2P encrypted agent messaging protocol |
| kibitz | https://github.com/kibitzsh/kibitz | not relevant | AI terminal output formatter |

### Agent Sandboxes and Isolated Execution

| Name | URL | Fit | Reason |
|---|---|---|---|
| vibe | https://github.com/lynaghk/vibe | not relevant | VM environment for coding agents |
| Matchlock | https://github.com/jingkaihe/matchlock | not relevant | Ephemeral micro-VMs for agents |
| Gondolin | https://github.com/earendil-works/gondolin | not relevant | Micro-VM sandbox for AI code |
| Sandstorm | https://github.com/tomascupr/sandstorm | not relevant | Disposable cloud VMs for agents |
| shuru | https://github.com/superhq-ai/shuru | not relevant | Linux microVMs for AI agents |
| open-terminal | https://github.com/open-webui/open-terminal | not relevant | Docker sandbox for AI assistants |
| nono | https://github.com/lukehinds/nono | not relevant | Kernel-level sandbox for agents |
| Klaw | https://github.com/klawsh/klaw.sh | not relevant | Kubernetes for AI agent orchestration |

### Agent Frameworks and Generic AI Assistants

| Name | URL | Fit | Reason |
|---|---|---|---|
| nanobot | https://github.com/HKUDS/nanobot | not relevant | Personal AI assistant framework |
| marvin-template | https://github.com/SterlingChin/marvin-template | not relevant | AI assistant template |
| LocalGPT | https://github.com/localgpt-app/localgpt | not relevant | Local AI assistant with memory |
| Picobot | https://github.com/louisho5/picobot | not relevant | Lightweight AI agent framework |
| CoPaw | https://github.com/agentscope-ai/CoPaw | not relevant | Local LLM assistant |
| BotMaker | https://github.com/jgarzik/botmaker | not relevant | Chatbot deployment platform |
| Skill Compose | https://github.com/MooseGoose0701/skill-compose | not relevant | Natural language agent builder |
| zuckerman | https://github.com/zuckermanai/zuckerman | not relevant | Self-rewriting AI agent |
| Automaton | https://github.com/Conway-Research/automaton | not relevant | AI agent with Ethereum wallet |

### Agent Skills, Knowledge, and Tooling

| Name | URL | Fit | Reason |
|---|---|---|---|
| clawhub | https://github.com/openclaw/clawhub | not relevant | AI agent skill registry |
| agent-trace | https://github.com/cursor/agent-trace | not relevant | AI code attribution spec |
| Database Skills | https://github.com/planetscale/database-skills | not relevant | Database knowledge for AI agents |
| antigravity-awesome-skills | https://github.com/sickn33/antigravity-awesome-skills | not relevant | Agent skill library |
| skills (Vercel) | https://github.com/vercel-labs/skills | not relevant | Modular AI agent skill ecosystem |
| Skill Scanner | https://github.com/cisco-ai-defense/skill-scanner | not relevant | AI skill security scanner |
| SwiftUI-Agent-Skill | https://github.com/twostraws/SwiftUI-Agent-Skill | not relevant | SwiftUI knowledge pack for AI |
| Attractor | https://github.com/strongdm/attractor | not relevant | Spec-driven development workflow |

### Codebase Analysis and Developer Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| FastCode | https://github.com/HKUDS/FastCode | not relevant | AST-based codebase analysis for LLMs |
| roam-code | https://github.com/Cranot/roam-code | not relevant | Code architecture graph generator |
| arbor | https://github.com/penso/arbor | not relevant | Codebase dependency graph |
| contextplus | https://github.com/ForLoopCodes/contextplus | not relevant | Codebase semantic graph via AST |
| jcodemunch-mcp | https://github.com/jgravelle/jcodemunch-mcp | not relevant | Codebase AST indexer for AI tools |
| clihub | https://github.com/thellimist/clihub | not relevant | MCP server to CLI converter |
| radar | https://github.com/skyhook-io/radar | not relevant | Local Kubernetes cluster explorer |
| sql-tap | https://github.com/mickamy/sql-tap | not relevant | SQL query interceptor for debugging |
| Desloppify | https://github.com/peteromallet/desloppify | not relevant | Codebase health scanner |
| Prek | https://github.com/j178/prek | not relevant | Fast pre-commit hook runner |
| difi | https://github.com/oug-t/difi | not relevant | Visual git diff tool |
| deff | https://github.com/flamestro/deff | not relevant | Terminal git diff reviewer |
| React Doctor | https://github.com/millionco/react-doctor | not relevant | React performance scanner |
| gitas | https://github.com/letmutex/gitas | not relevant | Git identity switcher |
| RTK | https://github.com/rtk-ai/rtk | not relevant | LLM cost reduction via log summarization |
| Portless | https://github.com/vercel-labs/portless | not relevant | Stable local dev URLs |
| distill | https://github.com/samuelfaj/distill | not relevant | Command output summarizer |

### AI/ML Research and Models

| Name | URL | Fit | Reason |
|---|---|---|---|
| MAHORAGA | https://github.com/ygwyg/MAHORAGA | not relevant | AI trading agent |
| Open Alice | https://github.com/TraderAlice/OpenAlice | not relevant | AI trading agent |
| ARCgentica | https://github.com/symbolica-ai/arcgentica | not relevant | ARC-AGI puzzle solver |
| OpenClaw-RL | https://github.com/Gen-Verse/OpenClaw-RL | not relevant | RL framework for agent training |
| Engram (DeepSeek) | https://github.com/deepseek-ai/Engram | not relevant | AI model architecture research |
| AutoGrad Engine | https://github.com/milanm/AutoGrad-Engine | not relevant | Minimal GPT training in C# |
| Step-3.5-Flash | https://github.com/stepfun-ai/Step-3.5-Flash | not relevant | Large sparse AI model |
| autoresearch-mlx | https://github.com/trevin-creator/autoresearch-mlx | not relevant | Apple Silicon ML research variant |
| Causal-Forcing | https://github.com/thu-ml/Causal-Forcing | not relevant | Real-time video generation research |
| Code2World | https://github.com/AMAP-ML/Code2World | not relevant | UI state prediction as HTML |
| Claude's C Compiler | https://github.com/anthropics/claudes-c-compiler | not relevant | C compiler written by AI |
| no-magic | https://github.com/Mathews-Tom/no-magic | not relevant | Pure Python ML implementations |
| copilot-sdk | https://github.com/github/copilot-sdk | not relevant | GitHub Copilot embedding SDK |
| DeepTutor | https://github.com/HKUDS/DeepTutor | not relevant | AI study tool with knowledge graph |
| evmbench | https://github.com/paradigmxyz/evmbench | not relevant | LLM security for smart contracts |
| bullshit-benchmark | https://github.com/petergpt/bullshit-benchmark | not relevant | LLM nonsense rejection benchmark |
| ClawRouter | https://github.com/BlockRunAI/ClawRouter | not relevant | Local LLM model router |
| Moltis | https://github.com/moltis-org/moltis | not relevant | Local LLM gateway |

### Desktop, OS, and System Utilities

| Name | URL | Fit | Reason |
|---|---|---|---|
| Thaw | https://github.com/stonerl/Thaw | not relevant | macOS menu bar manager |
| TermClean | https://github.com/daijinhai/TermClean | not relevant | Terminal disk cleanup tool |
| dodotidy | https://github.com/DodoApps/dodotidy | not relevant | macOS system cleaner |
| cleardisk | https://github.com/bysiber/cleardisk | not relevant | macOS dev artifact cleaner |
| MaximizeToVirtualDesktop | https://github.com/shanselman/MaximizeToVirtualDesktop | not relevant | Windows virtual desktop tool |
| Monarch | https://github.com/Nuzair46/Monarch | not relevant | Monitor management utility |
| OmniSearch | https://github.com/Eul45/omni-search | not relevant | Windows NTFS file search |
| winget-tui | https://github.com/shanselman/winget-tui | not relevant | Windows package manager UI |
| ansi-saver | https://github.com/lardissone/ansi-saver | not relevant | macOS ANSI art screensaver |
| TerminalStart | https://github.com/TheCSir/TerminalStart | not relevant | Retro developer dashboard |
| BetterCapture | https://github.com/jsattler/BetterCapture | not relevant | macOS screen recorder |
| SuperCmd | https://github.com/SuperCmdLabs/SuperCmd | not relevant | macOS launcher |
| itsypad-macos | https://github.com/nickustinov/itsypad-macos | not relevant | Clipboard history app |
| motrix-next | https://github.com/AnInsomniacy/motrix-next | not relevant | Download manager rewrite |
| zerobrew | https://github.com/lucasgelfond/zerobrew | not relevant | Homebrew replacement |
| Kaku | https://github.com/tw93/Kaku | not relevant | AI-optimized macOS terminal |
| Restty | https://github.com/wiedymi/restty | not relevant | WebAssembly terminal |
| Net-Bar | https://github.com/iad1tya/Net-Bar | not relevant | macOS network speed display |
| FreeFlow | https://github.com/zachlatta/freeflow | not relevant | macOS dictation app |
| Arcmark | https://github.com/Geek-1001/arcmark | not relevant | macOS bookmark manager |
| CodexDesktop-Rebuild | https://github.com/Haleclipse/CodexDesktop-Rebuild | not relevant | Codex Desktop for Windows/Linux |

### Audio, Voice, TTS, and Music

| Name | URL | Fit | Reason |
|---|---|---|---|
| voicebox | https://github.com/jamiepine/voicebox | not relevant | Voice cloning and synthesis editor |
| sas-audio-processor | https://github.com/shiehn/sas-audio-processor | not relevant | Audio processing for AI agents |
| qwen3-TTS-studio | https://github.com/bc-dunia/qwen3-TTS-studio | not relevant | Text-to-speech UI |
| Qwen3-TTS | https://github.com/QwenLM/Qwen3-TTS | not relevant | Text-to-speech model |
| Hibiki-Zero | https://github.com/kyutai-labs/hibiki-zero | not relevant | Real-time speech translation |
| voxtral.c | https://github.com/antirez/voxtral.c | not relevant | Speech-to-text in C |
| Voxtral Mini Realtime | https://github.com/TrevorS/voxtral-mini-realtime-rs | not relevant | Real-time voice AI client |
| ACE-Step UI | https://github.com/fspecii/ace-step-ui | not relevant | Music generation UI |
| heartlib | https://github.com/HeartMuLa/heartlib | not relevant | Music generation model |
| qwen-asr | https://github.com/antirez/qwen-asr | not relevant | Speech-to-text engine |
| voicepaste | https://github.com/junyuw2289-svg/voicepaste | not relevant | Speech to text paste tool |
| voxt | https://github.com/hehehai/voxt | not relevant | macOS voice input tool |
| Textream | https://github.com/f/textream | not relevant | macOS teleprompter app |

### Video and 3D Generation

| Name | URL | Fit | Reason |
|---|---|---|---|
| MOVA | https://github.com/OpenMOSS/MOVA | not relevant | Synchronized video+audio generation |
| YumCut | https://github.com/IgorShadurin/app.yumcut.com | not relevant | AI video generator |
| lingbot-world | https://github.com/Robbyant/lingbot-world | not relevant | Video world generation model |
| worldfm | https://github.com/inspatio/worldfm | not relevant | 3D world generation |
| CorridorKey | https://github.com/nikopueringer/CorridorKey | not relevant | Green-screen compositing neural net |

### Robotics and Hardware

| Name | URL | Fit | Reason |
|---|---|---|---|
| lingbot-vla | https://github.com/Robbyant/lingbot-vla | not relevant | Robot control model |
| asimov-v0 | https://github.com/asimovinc/asimov-v0 | not relevant | 3D-printed humanoid robot |
| zclaw | https://github.com/tnm/zclaw | not relevant | ESP32 microcontroller AI agent |
| apple-silicon-accelerometer | https://github.com/olvvier/apple-silicon-accelerometer | not relevant | Hidden sensor access |
| btrpa-scan | https://github.com/HackingDave/btrpa-scan | not relevant | Bluetooth scanner |
| ToothPaste | https://github.com/Brisk4t/ToothPaste | not relevant | Hardware USB password typer |
| be-more-agent | https://github.com/brenpoly/be-more-agent | not relevant | Raspberry Pi voice assistant |
| spank | https://github.com/taigrr/spank | not relevant | MacBook slap detection |
| agent-device | https://github.com/callstackincubator/agent-device | not relevant | Mobile device control for AI agents |

### Networking, Security, and Privacy

| Name | URL | Fit | Reason |
|---|---|---|---|
| tirith | https://github.com/sheeki03/tirith | not relevant | Shell security command hook |
| PYDNS-Scanner | https://github.com/xullexer/PYDNS-Scanner | not relevant | DNS server scanner |
| VortexL2 | https://github.com/iliya-Developer/VortexL2 | not relevant | L2TPv3 tunnel automation |
| paqet | https://github.com/hanselime/paqet | not relevant | SOCKS5 proxy/firewall bypass |
| paqctl | https://github.com/SamNet-dev/paqctl | not relevant | Censorship circumvention tool |
| dpi-detector | https://github.com/Runnin4ik/dpi-detector | not relevant | ISP censorship detection |
| ReMemory | https://github.com/eljojo/rememory | not relevant | Cryptographic dead man's switch |
| NodeWarden | https://github.com/shuaiplus/NodeWarden | not relevant | Bitwarden on Cloudflare Workers |
| wormhole | https://github.com/MuhammadHananAsghar/wormhole | not relevant | ngrok alternative |
| pgrok | https://github.com/R44VC0RP/pgrok | not relevant | Self-hosted ngrok alternative |
| xfr | https://github.com/lance0/xfr | not relevant | Network throughput testing tool |

### PDF, Document, and OCR Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| LibPDF | https://github.com/libpdf-js/core | not relevant | TypeScript PDF toolkit |
| vmprint | https://github.com/cosmiciron/vmprint | not relevant | TypeScript PDF typesetting |
| pdfcraft | https://github.com/PDFCraftTool/pdfcraft | not relevant | Self-hosted PDF toolkit |
| pdfdelta | https://github.com/mli55/pdfdelta | not relevant | PDF visual diff tool |
| pdf2epub-paddle | https://github.com/jarodise/pdf2epub-paddle | not relevant | PDF to EPUB converter |
| PDF-Slides-to-Hand-Outs | https://github.com/flodlol/PDF-Slides-to-Hand-Outs | not relevant | Slide to handout converter |
| DeepSeek-OCR-2 | https://github.com/deepseek-ai/DeepSeek-OCR-2 | not relevant | Advanced OCR model |
| GLM-OCR | https://github.com/zai-org/GLM-OCR | not relevant | Vision-language OCR |

### UI Libraries, CSS, and Design Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| BlossomColorPicker | https://github.com/dayflow-js/BlossomColorPicker | not relevant | Flower-style color picker UI |
| fun-with-clip-path | https://github.com/Momciloo/fun-with-clip-path | not relevant | CSS animation demo |
| goey-toast | https://github.com/anl331/goey-toast | not relevant | React toast notification library |
| Sileo | https://github.com/hiaaryan/sileo | not relevant | React toast with physics animations |
| SoundCN | https://github.com/kapishdima/soundcn | not relevant | Sound effects for UI components |
| Islands Dark | https://github.com/bwya77/vscode-dark-islands | not relevant | VSCode theme |
| fonttrio | https://github.com/kapishdima/fonttrio | not relevant | Font combination generator |
| Uncodixfy | https://github.com/cyxzdev/Uncodixfy | not relevant | Anti-generic UI markdown rules |
| Oat | https://github.com/knadh/oat | not relevant | Generic semantic UI library |
| Kumo | https://github.com/cloudflare/kumo | not relevant | Cloudflare UI component library |
| visual-json | https://github.com/vercel-labs/visual-json | not relevant | Schema-aware JSON editor |
| Antigravity-claw | https://github.com/deborahikssv/Antigravity-claw | not relevant | Webpage physics animation |
| vibra-code | https://github.com/sa4hnd/vibra-code | not relevant | React Native app generator |

### Diagram and Visualization Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| Pretty-mermaid-skills | https://github.com/imxv/Pretty-mermaid-skills | not relevant | Mermaid diagram rendering plugin |
| beautiful-mermaid | https://github.com/lukilabs/beautiful-mermaid | not relevant | Enhanced Mermaid diagram renderer |
| BeautifulMermaid (Swift) | https://github.com/lukilabs/beautiful-mermaid-swift | not relevant | Swift Mermaid diagram renderer |
| PaperBanana | https://github.com/llmsresearch/paperbanana | not relevant | Academic diagram generation |
| AutoFigure-Edit | https://github.com/ResearAI/AutoFigure-Edit | not relevant | Research diagram SVG generation |
| Edit Banana | https://github.com/BIT-DataLab/Edit-Banana | not relevant | Screenshot to DrawIO converter |
| Excalidraw MCP App | https://github.com/antonpk1/excalidraw-mcp-app | not relevant | AI diagram generation in Excalidraw |
| Visual Explainer | https://github.com/nicobailon/visual-explainer | not relevant | Terminal output to HTML converter |
| chartli | https://github.com/ahmadawais/chartli | not relevant | Terminal charting library |

### Social Media, Bookmarks, and Content Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| auto-commenter | https://github.com/rokpiy/auto-commenter | not relevant | Automated Reddit commenter |
| Siftly | https://github.com/viperrcrypto/Siftly | not relevant | Twitter bookmark organizer |
| x-bookmarks | https://github.com/sharbelxyz/x-bookmarks | not relevant | Twitter bookmarks to tasks |
| superbrain | https://github.com/sidinsearch/superbrain | not relevant | Android link organizer |
| humanizer | https://github.com/blader/humanizer | not relevant | AI text rewriter |
| jackbutcher.md | https://github.com/visualizevalue/jackbutcher.md | not relevant | Writing style patterns |
| HashMyLinks | https://github.com/mike-dev-stuff/hashmylinks | not relevant | URL-stored profile page |

### Job, Resume, and Career Tools

| Name | URL | Fit | Reason |
|---|---|---|---|
| hr-breaker | https://github.com/btseytlin/hr-breaker | not relevant | Resume rewriter for ATS filters |
| ApplyPilot | https://github.com/Pickle-Pixel/ApplyPilot | not relevant | Autonomous job application bot |

### Email Clients

| Name | URL | Fit | Reason |
|---|---|---|---|
| Velo | https://github.com/avihaymenahem/velo | not relevant | Desktop Gmail client |
| msgvault | https://github.com/wesm/msgvault | not relevant | Local Gmail archive |
| Secure OpenClaw | https://github.com/ComposioHQ/secure-openclaw | not relevant | Messaging assistant for Gmail |

### Map Poster Generators

| Name | URL | Fit | Reason |
|---|---|---|---|
| MapToPoster JS | https://github.com/dimartarmizi/map-to-poster | not relevant | Map to poster converter (not a map library) |
| maptoposter | https://github.com/originalankur/maptoposter | not relevant | City map poster generator |
| terraink | https://github.com/yousifamanuel/terraink | not relevant | Map poster generator |

### Games and Novelty

| Name | URL | Fit | Reason |
|---|---|---|---|
| three-quake | https://github.com/mrdoob/three-quake | not relevant | Quake engine port in browser |
| dirplayer-rs | https://github.com/igorlira/dirplayer-rs | not relevant | Shockwave emulator |
| retrotick | https://github.com/lqs/retrotick | not relevant | Browser x86 emulator |

### Miscellaneous Unrelated

| Name | URL | Fit | Reason |
|---|---|---|---|
| Vouch | https://github.com/mitchellh/vouch | not relevant | OSS contribution trust system |
| md-browse | https://github.com/needle-tools/md-browse | not relevant | Markdown view browser |
| litter | https://github.com/dnakov/litter | not relevant | iOS coding agent |
| BrainRotGuard | https://github.com/GHJJ123/brainrotguard | not relevant | YouTube approval system for parents |
| DJI Logbook | https://github.com/arpanghosh8453/dji-logbook | not relevant | Drone flight log viewer |
| Telephone Transcriber | https://github.com/andygmassey/telephone-and-conversation-transcriber | not relevant | Phone call transcription |
| Stik | https://github.com/0xMassi/stik_app | not relevant | Note-capture app |
| Obsync | https://github.com/Santofer/Obsync | not relevant | Obsidian-Apple Reminders sync |
| Hacker News Client | https://github.com/IronsideXXVI/Hacker-News | not relevant | Native HN client |
| GNL | https://github.com/khalildh/garment-notation) | not relevant | Garment construction language |
| java.evolved | https://github.com/javaevolved/javaevolved.github.io | not relevant | Java education site |
| free-coding-models | https://github.com/vava-nessa/free-coding-models | not relevant | Free AI model dashboard |
| gitcredits | https://github.com/Higangssh/gitcredits | not relevant | Git history movie credits |
| git-city | https://github.com/srizzon/git-city | not relevant | 3D GitHub profile visualization |
| Oclock | https://github.com/azialle/Oclock | not relevant | WebGL globe time zones |
| Aeris | https://github.com/kewonit/aeris | not relevant | 3D flight radar (not booking-related) |
| Mini Diarium | https://github.com/fjrevoredo/mini-diarium | not relevant | Encrypted journaling app |
| Life System | https://github.com/davidhariri/life-system | not relevant | Markdown life planning |
| opusdelta | https://github.com/OpusDelta/opusdelta | not relevant | AI emotional states research |
| wrapped.nvim | https://github.com/aikhe/wrapped.nvim | not relevant | Neovim stats plugin |
| Zen-C | https://github.com/z-libs/Zen-C | not relevant | C library utilities |
| taws | https://github.com/huseyinbabal/taws | not relevant | Terminal AWS manager |
| OpenHamClock | https://github.com/accius/openhamclock | not relevant | Ham radio dashboard |
| agentlytics | https://github.com/f/agentlytics | not relevant | AI coding assistant analytics |
| RepoCheck | https://github.com/WtxwNs/RepoCheck | not relevant | GitHub repo health auditor |
| AlmostNode | https://github.com/macaly/almostnode | not relevant | Node.js in browser |
| Greenlight | https://github.com/RevylAI/greenlight | not relevant | iOS App Store guideline scanner |
| DevOps Interviews | https://github.com/devops-interviews/devops-interviews | not relevant | Interview question collection |
| llmfit | https://github.com/AlexsJones/llmfit | not relevant | LLM hardware compatibility |
| weathr | https://github.com/Veirt/weathr | not relevant | Terminal weather display |
| aso-skills | https://github.com/Eronred/aso-skills | not relevant | App Store Optimization skills |
| MedgeClaw | https://github.com/xjtulyc/MedgeClaw | not relevant | Biomedical AI assistant |
| frouter | https://github.com/jyoung105/frouter | not relevant | Free AI API monitor |
| rustc-php | https://github.com/mrconter1/rustc-php | not relevant | Rust compiler in PHP |
| kula | https://github.com/c0m4r/kula | not relevant | Generic Linux server monitoring |
| itsytv-macOS | https://github.com/nickustinov/itsytv-macos | not relevant | Apple TV remote app |
| mdvi | https://github.com/taf2/mdvi | not relevant | Terminal markdown viewer |
| TinyIce | https://github.com/DatanoiseTV/tinyice | not relevant | Simple streaming server |
| OpenUsage | https://github.com/robinebers/openusage | not relevant | AI tool usage stats |
| tgterm | https://github.com/antirez/tgterm | not relevant | Telegram terminal control |
| Youtu-RAG | https://github.com/TencentCloudADP/youtu-rag | not relevant | Multi-agent document retrieval |
| terminui | https://github.com/ahmadawais/terminui | not relevant | Terminal UI library |
| CLI-Anything | https://github.com/HKUDS/CLI-Anything | not relevant | Software to CLI interface generator |
| unredact | https://github.com/Alex-Gilbert/unredact | not relevant | Redaction inference tool |

---

## Methodology Notes

Repos were evaluated against the operating doctrine, working venture thesis, and stack thesis using these primary filters:

1. Does this repo help research, compare, launch, measure, or deepen travel booking opportunities?
2. Does it fill a defined stack role without creating infrastructure sprawl?
3. Is it modular, replaceable, and operationally clear?
4. Does trending popularity alone justify inclusion? (No.)
5. Does being agent-related alone justify inclusion? (No.)

The vast majority of repos (~87%) were classified as "not relevant" because they are Claude Code wrappers, OpenClaw variants, coding agent management tools, desktop utilities, unrelated AI/ML research, or novelty projects with no connection to travel booking, market research, content publishing, analytics, or autonomous business workflows.
