# Stack Thesis and Technology Evaluation Framework v1

## Purpose

This document defines how the company should think about its stack before making detailed tool commitments. It is not a list of favorite technologies. It is a decision framework for selecting, sequencing, and constraining technology in service of the business doctrine, the working venture thesis, and the portfolio model.

The goal of the stack is not technical sophistication for its own sake. The goal is to help the company research opportunities, compare wedges, launch experiments, observe outcomes, and deepen what works without accumulating unnecessary complexity.

## Inputs

This document is downstream of three higher-level documents:

* Operating Doctrine v1
* Working Venture Thesis v0
* Opportunity Research and Portfolio Model v0

Those documents define the principles, current business direction, and operating model. This document defines what the stack must do to support them.

## Core Stack Thesis

The stack should maximize learning speed, comparability, modularity, and operational clarity while minimizing coupling, hidden state, and infrastructure bloat.

The company needs a stack that can support open-ended internal discovery and disciplined external execution. That means:

* broad internal research and experimentation must be cheap to launch and easy to compare
* customer-facing wedges must remain clear, measurable, and operationally manageable
* tools must be replaceable when the market thesis sharpens
* autonomous components must operate within explicit boundaries and human-readable state

The stack exists to make better decisions faster, not to create a technically impressive but strategically diffuse system.

## What The Stack Must Enable

The early stack must support five company-level jobs.

### 1. Opportunity sensing

The system must continuously gather, structure, and compare inputs about markets, locations, customer intents, economics, demand patterns, and competitor activity.

### 2. Hypothesis and experiment management

The system must allow research tracks, hypotheses, experiments, and live wedges to be defined, compared, promoted, paused, or killed.

### 3. Market-facing execution

The system must support landing pages, content experiments, funnels, and booking flows for one or several clearly separated wedges.

### 4. Measurement and decision support

The system must provide analytics, logs, scoring, and evidence trails good enough to inform portfolio decisions.

### 5. Controlled autonomy

The system must support autonomous research and operational action where useful, while preserving auditability, approvals, rollback, and explicit decision boundaries.

## Architecture Principles

### 1. Keep the stack subordinate to the doctrine

Technology exists to support the business model and the operating principles. No tool should be adopted mainly because it is fashionable, clever, or agent-native.

### 2. Prefer modularity over deep entanglement

Components should be separable and replaceable. The company is still refining its market thesis, so the stack must remain adaptable without costly rewrites.

### 3. Favor clear state over magic

The system should expose what it knows, what it did, what changed, and why. Human-readable state, logs, and decision records are preferred over opaque automation.

### 4. Optimize for experiment velocity, not premature scale complexity

The early stack should make it easy to launch, compare, edit, pause, and remove experiments. It should not over-optimize for edge-case scale before real market pull exists.

### 5. Preserve clean boundaries between layers

Research, orchestration, publishing, analytics, booking, and portfolio decision-making should not be fused unnecessarily. Separation improves clarity and replaceability.

### 6. Build only what creates durable advantage

Infrastructure that only replicates commodity capability should usually be bought, reused, or deferred. Build custom systems where they improve learning loops, wedge execution, or strategic control.

### 7. Human approval should remain easy to insert or remove

The company should be able to tighten or loosen autonomy by stage. Approval gates should be configurable rather than hard-coded into an inflexible process.

### 8. Reduce calendar dependence, not just task time

The stack should not merely help humans do more manual work faster. It should reduce the degree to which growth depends on constant real-time attention, coordination, supervision, and intervention. Good infrastructure increases leverage. Bad infrastructure only accelerates busyness.

Whenever possible, the stack should turn repeated human effort into reusable workflows, automation, durable state, assets, and reviewable systems that continue to create value without requiring constant calendar occupation.

## Reference Architecture

The stack should be evaluated against a functional architecture rather than a vendor list.

### Layer 1: Data and signals

This layer ingests the raw inputs needed for opportunity research and execution. It may include market data, search data, page performance, booking data, competitor observations, operational metrics, and manually entered insights.

### Layer 2: Knowledge and state

This layer stores structured knowledge about ideas, tracks, hypotheses, experiments, wedges, brands, locations, and decisions. It should make portfolio state explicit.

### Layer 3: Research and scoring

This layer supports research workflows, ranking models, opportunity comparison, and hypothesis generation.

### Layer 4: Orchestration and agents

This layer runs autonomous or semi-autonomous workflows for sensing, analysis, content generation, reporting, monitoring, and controlled operational tasks.

### Layer 5: Publishing and experimentation

This layer supports content creation, landing page deployment, SEO experimentation, funnel variants, and wedge-specific market-facing execution.

### Layer 6: Product and commerce integration

This layer handles the booking-facing product surface, including search, listing, detail, comparison, pre-booking steps, booking flows, and external infrastructure such as LiteAPI.

### Layer 7: Analytics, observability, and review

This layer measures traffic, conversion, economics, operational quality, experiment outcomes, and autonomous-system behavior. It supports decision review and rollback.

### Layer 8: Governance and approvals

This layer defines permissions, approval rules, audit trails, change history, and decision logs. Early on, this may be lightweight. It still must exist.

## Core System Roles

The stack should be chosen by role. A single tool may fill multiple roles, but the roles should stay conceptually distinct.

The required roles are:

* research capture and market intelligence
* structured knowledge and portfolio state management
* experiment registry and comparison
* orchestration and workflow execution
* content and landing-page generation
* site deployment and hosting
* search and booking integration
* analytics and event tracking
* observability and reporting
* decision logging and review
* authentication, permissions, and operational safety

## Adoption Logic: Build, Buy, Reuse, Or Delay

### Build when:

* the capability is tightly coupled to the company's learning loop or wedge logic
* the company needs strategic control over it
* good off-the-shelf options force harmful constraints
* the capability is likely to become a source of defensibility

### Buy or reuse when:

* the capability is commoditized
* speed matters more than ownership
* the integration boundary is clean
* replacement later would be feasible

### Delay when:

* the requirement is speculative
* the system would add complexity before it adds learning
* the functionality matters only after a wedge has already proven itself

## Technology Evaluation Criteria

Every tool, framework, project, or vendor should be scored against the same criteria.

### Strategic fit

Does it help the company research, compare, launch, measure, or deepen opportunities that match the current venture thesis?

### Time to useful output

How quickly does it help the team reach a real experiment, not just a demo?

### Modularity

Can it be swapped out later without breaking the rest of the system?

### Operational clarity

Does it expose logs, state, configuration, and outcomes clearly enough for humans to inspect?

### Maintenance burden

How much ongoing engineering and operational cost does it create?

### Reliability and maturity

Is it stable enough for the layer where it will be used?

### Flexibility of control

Can it support different levels of autonomy, approval, and boundary setting?

### Learning leverage

Does it increase the quality or speed of portfolio learning?

### Leverage over live labour

Does it reduce ongoing dependence on real-time human attention, manual coordination, repetitive supervision, or calendar load as the business grows?

### Economic efficiency

Is the cost justified by the increase in speed, signal, or capability?

### Replaceability

If the market thesis changes, can the company migrate away from it without disproportionate pain?

## Adoption Horizons

The stack should be organized into time horizons rather than bought all at once.

### Horizon 1: Immediate

These are capabilities the company likely needs early:

* market research capture
* structured portfolio state
* experiment tracking
* lightweight orchestration
* page and content publishing
* analytics and event tracking
* booking integration through LiteAPI or equivalent
* basic observability and decision logging

### Horizon 2: After initial signal

These become more important after some live wedges exist:

* more advanced scoring systems
* richer workflow orchestration
* stronger agent supervision
* approval systems for autonomous actions
* better internal tooling for portfolio review
* more customized product and funnel logic

### Horizon 3: After repeated wins

These should usually wait until the company has stronger evidence:

* extensive internal platforms
* heavy multi-agent management layers
* complex brand or multi-business admin systems
* deeply custom infrastructure that assumes stable market identity
* optimization for scale before durable demand exists

## What To Avoid Early

The stack should avoid the following patterns in the early stage:

* orchestration systems that are more complicated than the workflows they manage
* internal platforms without clear users or repeated needs
* custom infrastructure for hypothetical scale
* too many databases or knowledge stores without crisp boundaries
* duplicate sources of truth
* agent systems that cannot explain their actions
* excessive abstraction before repeated patterns exist
* tightly coupled architecture around assumptions that are still under research

## Minimal Viable Stack Shape

Before detailed tool choices, the target shape should remain simple.

A viable early stack likely looks like this:

* one primary system for structured state and portfolio tracking
* one lightweight orchestration layer for recurring workflows and autonomous tasks
* one publishing surface for landing pages and experiments
* one booking/commercial integration layer such as LiteAPI
* one analytics/event pipeline
* one observability and reporting layer
* one decision log or ADR-style record system

This shape matters more than the exact product names chosen to fill it.

## Source Of Truth Policy

The stack should have explicit ownership of state. Different layers may share data, but they should not compete as equal authorities.

The default source-of-truth rules are:

- portfolio state should live in one primary structured state system
- publishing and deployment state should live in the publishing or deployment layer
- analytics and event state should live in the event pipeline and analytics store
- decision history should live in the decision log or ADR system
- booking and transaction state should live in the product and commerce layer, with external provider records treated as authoritative where applicable
- agent memory, chat history, and ephemeral workflow context must never become the primary source of truth for durable business state

Whenever two systems hold overlapping data, one must be explicitly designated authoritative and the other treated as derived, cached, or downstream.

## Agent And Automation Policy

Autonomy should be introduced by job type, not by ideology.

Good early agent candidates include:

* market and destination research
* competitor monitoring
* internal summarization and reporting
* content drafting for experiments
* experiment comparison and pruning suggestions
* structured data gathering and enrichment

Higher-risk actions should require stronger review before automation, especially:

* major market-facing changes
* irreversible content deletions
* brand changes
* pricing or margin changes
* direct customer-affecting product logic
* critical infrastructure changes

The principle is simple: automate where the downside is bounded and the learning value is high.

## Decision Format For Tool Choices

Every major stack choice should be recorded in a short, repeatable format.

### Recommended template

* role being filled
* problem to solve
* candidate options
* decision
* why this option was chosen
* what assumptions remain uncertain
* what would trigger replacement
* current horizon: now, later, or defer

This can be captured as lightweight architecture decision records.

## How GitHub Projects Should Be Evaluated

Open-source projects, frameworks, and agent systems should not be reviewed as standalone curiosities. Each one should be mapped to:

* which system role it would fill
* which horizon it belongs to
* whether it is core, optional, or distracting
* what dependency or lock-in it creates
* whether it improves research speed, experiment quality, or portfolio control

A project is interesting only if it earns a place in the stack shape.

## Open Questions

The following stack questions remain intentionally unresolved until more business evidence exists:

* which database or structured knowledge layer should be the primary source of truth
* which orchestration framework best balances simplicity and extensibility
* how much agent autonomy should be allowed at each lifecycle stage
* what publishing stack best supports SEO experimentation and wedge separation
* how much of the product flow should be custom versus LiteAPI-driven in the early phase
* what event and analytics model best supports portfolio decisions
* when a wedge deserves separate tooling or a separate brand surface

## Success Standard

The stack is working when:

* new tracks and experiments can be launched quickly
* portfolio state is explicit and easy to review
* autonomous tasks are useful without becoming chaotic
* market-facing wedges stay clear and measurable
* tools can be changed without destabilizing the business
* the company becomes better at choosing and deepening opportunities over time
* the stack reduces real-time human dependence rather than merely accelerating human busyness

The best stack is not the one with the most components. It is the one that makes the portfolio sharper, the experiments faster, and the execution clearer.

## Summary

This company needs a stack for disciplined opportunity discovery and focused wedge execution.

The right stack will be modular, observable, replaceable, and good at supporting research, experimentation, publishing, measurement, and controlled autonomy. It should stay simple until the business earns complexity. It should reduce calendar dependence rather than merely speeding up manual busyness. It should always serve the doctrine, the venture thesis, and the portfolio model rather than pulling the company away from them.
