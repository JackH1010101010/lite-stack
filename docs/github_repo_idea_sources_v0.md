# GitHub Repo Idea Sources v0

## Purpose

This file captures repositories that are not direct stack candidates but provide useful architectural patterns, design ideas, or conceptual inspiration for the company stack. These repos should be studied for how they solve problems, not adopted as dependencies.

---

### OpenViking

- URL: https://github.com/volcengine/OpenViking
- What idea it provides: Stores AI agent memory as a hierarchical filesystem rather than a flat vector database. Organizes knowledge into directories, files, and nested structures that mirror how humans think about categories.
- What it inspires for the company stack: The portfolio model has a natural hierarchy (opportunity families → hypotheses → experiments → wedges → decisions). A filesystem-style knowledge structure could make portfolio state more navigable and inspectable than a flat database or document store. Consider whether portfolio state should be organized as a directory tree rather than a single database.

### OneContext

- URL: https://github.com/TheAgentContextLab/OneContext
- What idea it provides: Shared context layer for AI agents so teams can resume work from the exact state of previous runs. Provides continuity across agent sessions.
- What it inspires for the company stack: Autonomous research and execution agents need continuity. When a market research agent runs Monday and a content agent runs Tuesday, the content agent needs the research agent's conclusions. A shared context layer prevents each agent from starting cold and enables the exploration loop to accumulate knowledge rather than repeat work.

### Attractor

- URL: https://github.com/strongdm/attractor
- What idea it provides: AI-first development workflow where software is defined entirely by specs written in Markdown. Specs are the source of truth; code is generated from them.
- What it inspires for the company stack: The company could define experiments, landing pages, and even booking flows as structured Markdown specs. Agents would generate and deploy from these specs. This pattern keeps human intent legible while enabling automated execution. The spec-as-source-of-truth model aligns with the doctrine's preference for human-readable state.

### Quoroom

- URL: https://github.com/quoroom-ai/room
- What idea it provides: Autonomous agent collective where agents vote and collaborate to achieve goals. Introduces deliberation and consensus mechanisms into multi-agent systems.
- What it inspires for the company stack: When multiple research agents produce conflicting assessments of a market (one says Bangkok is strong, another says it is weak), a voting or deliberation mechanism could surface disagreement rather than silently picking one. This pattern is relevant for the scoring and comparison layer. Not needed now, but worth remembering when the research system produces conflicting signals.

### hive

- URL: https://github.com/adenhq/hive
- What idea it provides: Self-evolving AI agent framework where failures trigger automated code improvement loops. Agents that fail learn from the failure and try again with modified behavior.
- What it inspires for the company stack: The exploitation loop should improve over time. When an experiment fails to convert, the system should learn from that failure. hive's pattern of automated self-improvement from failure is conceptually aligned with the doctrine's goal of becoming better at choosing and deepening opportunities. The implementation is too aggressive for early use, but the feedback-loop pattern matters.

### nanobot

- URL: https://github.com/HKUDS/nanobot
- What idea it provides: Complete personal AI assistant framework in approximately 4,000 lines of Python. Includes persistent memory, background agents, and messaging integrations in a small codebase.
- What it inspires for the company stack: Proof that a useful agent system does not require massive infrastructure. The company should aim for a similarly lean agent layer. If the core agent framework exceeds a few thousand lines, it is likely over-engineered for the current stage. Small, inspectable agent systems are preferable to large frameworks.

### dash

- URL: https://github.com/agno-agi/dash
- What idea it provides: Self-learning AI data analyst that understands schemas, remembers past queries, and improves over time using multiple context layers. Appeared across three source files (bookmarked, daily-21, monthly-4), indicating sustained interest.
- What it inspires for the company stack: The analytics and decision support layer should learn from past queries. When the operator asks "which market had the best conversion last week?" the system should remember that question and improve its answer next time. The multi-context-layer approach (schema understanding, query memory, improvement over time) is a design pattern worth borrowing for the analytics pipeline.

### Pro Workflow

- URL: https://github.com/rohitg00/pro-workflow
- What idea it provides: Stores corrections in SQLite memory so AI coding agents learn from developer feedback. Creates a persistent feedback loop between human judgment and agent behavior.
- What it inspires for the company stack: When the operator overrides an agent's recommendation (e.g., rejecting a proposed experiment or correcting a market assessment), that correction should be stored and used to improve future agent behavior. The pattern of structured correction memory is directly relevant to bounded autonomy with learning.

### OpenPlanter

- URL: https://github.com/ShinMegamiBoson/OpenPlanter
- What idea it provides: Recursive investigation agent that analyzes corporate registries, lobbying records, contracts, and campaign finance data. Demonstrates how to build deep, multi-step research agents that follow leads across data sources.
- What it inspires for the company stack: Market research for travel may require recursive investigation: start with a destination, discover hotel supply, follow to competitor analysis, discover pricing patterns, follow to demand signals. The recursive investigation pattern is more powerful than single-step data extraction for the opportunity sensing layer.

### HermitClaw

- URL: https://github.com/brendanhogan/hermitclaw
- What idea it provides: Autonomous research agent that self-selects topics and writes reports without human prompting.
- What it inspires for the company stack: The exploration loop should eventually be capable of autonomous topic selection. Instead of the operator telling the system "research Bangkok hotels," the system should be able to identify that Bangkok is worth researching based on signals it has already gathered. HermitClaw demonstrates the pattern of autonomous research agenda setting, which is relevant for the mature version of opportunity sensing.

### OpenClaw Foundry

- URL: https://github.com/lekt9/openclaw-foundry
- What idea it provides: Watches repetitive workflows and automatically generates automation code for them. Discovers patterns in human behavior and proposes automation.
- What it inspires for the company stack: The company will develop repetitive workflows (research a new market, create a landing page, check conversion metrics, decide whether to continue). Instead of manually automating each one, the system could observe human workflows and suggest automation. This pattern supports the doctrine goal of increasing autonomy over time without front-loading automation design.

### Skyll

- URL: https://github.com/assafelovic/skyll
- What idea it provides: API that allows AI agents to dynamically retrieve skill files at runtime instead of pre-installing them. Skills are loaded on demand when an agent encounters a task it does not have a capability for.
- What it inspires for the company stack: Agent capabilities should be modular and loadable. When the company decides to research a new market or try a new experiment type, the system should be able to acquire new skills without rebuilding. Dynamic capability loading supports the adaptability the doctrine requires.

### ClawRouter

- URL: https://github.com/BlockRunAI/ClawRouter
- What idea it provides: Local LLM router that automatically selects cheaper or stronger models based on task complexity to reduce inference cost. Appeared in both bookmarked repos and weekly trending.
- What it inspires for the company stack: Not all agent tasks require the same model quality. Market research summaries can use cheaper models. Final content generation or booking-flow decisions may need stronger models. Automatic model routing by task type could significantly reduce operating costs as the system scales autonomous operations.

### TenacitOS

- URL: https://github.com/carlosazaustre/tenacitOS
- What idea it provides: Dashboard for monitoring agents with metrics, logs, and cost analytics. Provides visibility into what autonomous agents are doing and what they are costing.
- What it inspires for the company stack: The observability layer needs to answer three questions: what are the agents doing, are they succeeding, and what are they costing. TenacitOS demonstrates the dashboard pattern for agent observability. The specific metrics (activity, success, cost) are directly relevant even though the tool itself is OpenClaw-specific.

### agent-trace

- URL: https://github.com/cursor/agent-trace
- What idea it provides: Open specification to track which lines of code were written by AI and which conversation generated them. Creates provenance records for AI-generated artifacts.
- What it inspires for the company stack: When agents generate landing pages, research reports, or experiment configurations, the company needs to know which agent created what, when, and based on what inputs. Provenance tracking for AI-generated business artifacts (not just code) supports the auditability requirement in the doctrine.

### Ars Contexta

- URL: https://github.com/agenticnotetaking/arscontexta
- What idea it provides: Generates a knowledge graph ("Skill Graph") to give AI agents structured context about what they know and can do.
- What it inspires for the company stack: The company should maintain an explicit map of what the system knows (which markets have been researched, which experiments are running, which capabilities exist). A structured context graph makes system self-awareness explicit rather than implicit, supporting better agent coordination and avoiding redundant work.

### LocalGPT

- URL: https://github.com/localgpt-app/localgpt
- What idea it provides: Lightweight local AI assistant with persistent memory stored in Markdown files and autonomous scheduled tasks.
- What it inspires for the company stack: The combination of Markdown-based memory and scheduled autonomous tasks is exactly the shape the early company stack needs. Persistent state in readable files, tasks that run on schedule without prompting. This is a small-scale proof that the minimal viable stack shape described in the stack thesis is achievable.

### ralph

- URL: https://github.com/snarktank/ralph
- What idea it provides: Runs autonomous AI loops until a feature is completed using PRDs and iterative commits. Demonstrates goal-directed autonomous execution with explicit completion criteria.
- What it inspires for the company stack: Experiments and research tasks should have explicit completion criteria. An autonomous research loop should run until it has gathered enough data to make a recommendation, not indefinitely. The PRD-driven completion model provides a pattern for bounded autonomous execution.

### Leapter

- URL: https://www.leapter.com
- What idea it provides: Commercial "logic layer for AI agents" that lets domain experts design complex business rules visually in natural language, then publishes them as deterministic, executable MCP tools. Agents call these tools to get hard yes/no decisions based on codified rules rather than LLM guesses. Compatible with n8n, CrewAI, MCP, OpenAI, Make.
- What it inspires for the company stack: The governance and approvals layer (Layer 8 in the reference architecture) needs a way to encode promotion criteria, kill criteria, and decision rights as executable rules rather than just documentation. Leapter demonstrates the pattern: natural language intent → visual verification → deterministic executable tool. An agent checking "does this experiment qualify for promotion?" should get a reliable answer from codified business logic, not an LLM interpretation. The deterministic execution model directly addresses the doctrine's requirement for "explicit rules, clear state, auditability, and strategic boundaries." Not open source, so not a near-term dependency, but the pattern is worth tracking for when business rules stabilize enough to justify encoding them.

### MAS-Factory (Multi-Agent System Factory)

- URL: https://github.com/MAS-Factory/MAS-Factory (research paper, Beijing University / Shanghai Jiao Tong University, March 2026)
- What idea it provides: Framework for building multi-agent systems by compiling natural language intent into executable directed graphs via "vibe graphing." Three-stage human-in-the-loop process: Role Assignment → Topology Design → Semantic Completion. Produces a JSON blueprint as intermediate representation that an execution engine compiles into a running multi-agent system. Includes a VS Code visual debugger showing agent topology and message passing in real time. Claims ~10x cost reduction vs code-first multi-agent development.
- What it inspires for the company stack: Several patterns are directly relevant. First, the intent → blueprint → execution pipeline: describing what you want, getting a structured JSON specification, reviewing it visually, then executing it. This mirrors how the company should design autonomous workflows with human approval gates. Second, the visual agent topology debugger: seeing exactly which agent did what, which node errored, and how messages flowed. This is the observability the stack thesis demands. Third, the JSON blueprint as inspectable intermediate state: workflow specifications should be human-readable documents, not opaque code. The framework itself is too immature for adoption (academic paper published days ago), but the architectural patterns are worth studying when designing the orchestration and agent coordination layers.

---

## Summary

These 19 repos and tools are not stack dependencies. They are reference implementations of patterns the company should consider:

| Pattern | Key repos |
|---------|-----------|
| Hierarchical knowledge structure | OpenViking |
| Shared agent context and continuity | OneContext |
| Spec-as-source-of-truth | Attractor |
| Agent deliberation and consensus | Quoroom |
| Self-improvement from failure | hive |
| Lean agent architecture | nanobot |
| Self-learning analytics | dash |
| Correction memory and feedback loops | Pro Workflow |
| Recursive multi-step investigation | OpenPlanter |
| Autonomous research agenda | HermitClaw |
| Workflow observation and automation discovery | OpenClaw Foundry |
| Dynamic capability loading | Skyll |
| Cost-optimized model routing | ClawRouter |
| Agent observability dashboard | TenacitOS |
| AI artifact provenance | agent-trace |
| Structured system self-awareness | Ars Contexta |
| Markdown memory with scheduled autonomy | LocalGPT |
| Goal-directed autonomous loops | ralph |
| Deterministic business logic for agent guardrails | Leapter |
| Intent-driven multi-agent topology with visual debugging | MAS-Factory |
