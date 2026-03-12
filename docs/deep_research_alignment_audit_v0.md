# Deep Research Alignment Audit v0

## Purpose

This document audits five deep research reports (reports 4 through 8) against the four core documents that define the company's intended operating model, portfolio logic, stack philosophy, and venture direction. The purpose is to determine whether the deep research reports are safe to use as the basis for implementation planning, and to flag any contradictions, omissions, terminology drift, or areas where the reports exceed or fall short of the core docs.

This is an alignment audit, not a strategy memo. It does not rewrite the strategy. It checks whether the research outputs are consistent with the governing documents.

## Files Reviewed

### Core docs (source of truth)

- `operating-doctrine-v1.md` — permanent principles, company shape, decision rules, success standards
- `opportunity-research-and-portfolio-model-v0.md` — lifecycle stages, portfolio limits, promotion/kill criteria, decision rights, cadence, separation logic
- `stack-thesis-and-technology-evaluation-framework-v1.md` — architecture principles, reference architecture (8 layers), source-of-truth policy, build/buy/delay logic, evaluation criteria, adoption horizons
- `working-venture-thesis-v0.md` — current business direction (travel/accommodation), LiteAPI as early candidate, strategic hypotheses, candidate opportunity families, portfolio logic, research questions

### Deep research reports (under audit)

- `deep-research-report-4.md` — portfolio state management
- `deep-research-report-5.md` — booking and travel API integration
- `deep-research-report-6.md` — SEO experimentation and programmatic page generation
- `deep-research-report-7.md` — analytics pipeline for conversion and economics
- `deep-research-report-8.md` — staged stack recommendation (synthesis of reports 4-7)

## Alignment Summary

### deep-research-report-4.md — Portfolio state management

**Classification: strongly aligned**

This report directly implements the Portfolio Model's lifecycle, the Stack Thesis's source-of-truth policy, and the Doctrine's bounded autonomy principle. It proposes a relational system of record (PostgreSQL), explicit lifecycle states, a first-class Decisions/Approvals model, and an audit trail. The core architecture is a faithful translation of the governing documents into a concrete implementation pattern. One notable omission: the "Portfolio Bet" stage is collapsed into the Wedge entity's lifecycle rather than being treated as a distinct entity or promotion gate.

### deep-research-report-5.md — Booking and travel API integration

**Classification: strongly aligned**

This report correctly treats LiteAPI as a leading near-term candidate (not a permanent commitment), proposes a provider-gateway abstraction for replaceability, and enforces internal transaction state authority separate from provider fulfilment authority. The build-vs-buy reasoning is well-calibrated to the Stack Thesis. The report introduces valuable concepts (idempotency, reconciliation automation, provider bake-off) that strengthen the operating model without contradicting it.

### deep-research-report-6.md — SEO experimentation and programmatic page generation

**Classification: strongly aligned**

This report introduces a "Page Factory" and "Page Registry" pattern that faithfully implements the Stack Thesis's publishing and experimentation layer while enforcing explicit state, approval gates, and auditability. It addresses a real gap in the core docs by detailing anti-spam and quality gate safeguards for programmatic travel SEO. The separation of SEO experiments from conversion experiments is well-aligned with the doctrine's principle of clarity and controlled complexity.

### deep-research-report-7.md — Analytics pipeline for conversion and economics

**Classification: strongly aligned**

This report proposes a ledger-first, event-log-driven analytics architecture with a clean three-plane model (behaviour, transaction, SEO). It enforces export-by-default to prevent vendor lock-in, designs join keys for wedge comparability, and treats the booking ledger as authoritative for money while analytics events are observational. It introduces privacy/consent handling (UK PECR) which is absent from the core docs but operationally important.

### deep-research-report-8.md — Staged stack recommendation

**Classification: mostly aligned**

This report synthesises reports 4-7 into a coherent near-term stack and 30/60/90 implementation plan. The synthesis is well-structured and the architectural choices are consistent with the Stack Thesis. However, it introduces two things that slightly exceed the core docs' deliberately open posture: (1) a specific implementation timeline with named milestones, and (2) a "wedge operating system" framing that could be misread as implying a more tightly coupled system than the doctrine's modular, replaceable ethos favours. These are not contradictions — they are recommendations that should be understood as proposals, not doctrine.

## Cross-Cutting Alignment Findings

### Autonomy

**Verdict: well-aligned across all reports.**

The Operating Doctrine, Principle 7, states: "Autonomous systems should increase research capacity, experimentation speed, operational throughput, and decision quality. They should not create uncontrolled complexity or random wandering. Autonomy must operate within explicit rules, clear state, auditability, and strategic boundaries."

All five reports consistently enforce this. Report 4 implements it through a Decision/Approval schema where agents can propose but not unilaterally approve. Report 5 enforces it through a provider-gateway pattern where agents never call vendor APIs directly. Report 6 enforces it through a Page Registry where agents can propose pages but cannot move them to "indexable" without approval. Report 7 enforces it through export-by-default so analytics never becomes opaque vendor state. Report 8 synthesises these into a "bounded autonomy constitution."

The Portfolio Model's decision rights section specifies that "autonomous systems may recommend promotions, pauses, kills, and pruning actions, but they may not unilaterally approve new live wedges, new brands, or irreversible structural changes unless governance rules are explicitly updated later." Report 4's Decision entity correctly restricts `decided_by_actor` to `{type: enum{human}, id: string}`, which is a faithful implementation of this rule.

### Portfolio logic

**Verdict: mostly aligned, with one structural omission.**

The Portfolio Model defines a 7-stage lifecycle: Idea, Research Track, Hypothesis, Experiment, Live Wedge, Portfolio Bet, Scaled Business or Brand. Report 4 provides entities for Idea, ResearchTrack, Hypothesis, Experiment, Wedge, and Brand, but it does not treat "Portfolio Bet" as a distinct entity or stage. Instead, Report 4's Wedge lifecycle enum is `{candidate, live, scaling, paused, killed, spun_out}`, which collapses the "Live Wedge to Portfolio Bet" transition into a single entity.

The Portfolio Model defines Portfolio Bet (Stage 6) as requiring that the company be "clear about whether the wedge is: part of the main business, a separated wedge under the same brand family, a candidate for a new brand or operating unit." This governance significance is lost if "Portfolio Bet" is not an explicit state or gate.

The Portfolio Model's default limits — "up to 8 active research tracks, up to 4 active experiments, up to 2 live wedges" — are not referenced or enforced in any report's schema or implementation recommendations. These limits are described in the Portfolio Model as "defaults, not immutable rules. Exceeding them should trigger a conscious review." The reports do not implement this "trigger a review" mechanism.

### One-promise-per-wedge clarity

**Verdict: well-aligned.**

The Operating Doctrine states: "The company should aim for one clear promise per brand or wedge, not necessarily one total promise for the whole company forever." The Working Venture Thesis echoes this: "each live wedge should have one dominant promise and a clear identity."

All reports respect this principle. Report 5 designs its provider gateway per-wedge. Report 6 builds Page Registry entries with wedge associations and requires each indexable page to have "a clear promise and scope." Report 7 designs analytics join keys to include `wedge_id` for portfolio comparability. Report 8 preserves wedge-level separation in its architecture diagram.

### Source-of-truth boundaries

**Verdict: strongly aligned — the reports' strongest dimension.**

The Stack Thesis's Source Of Truth Policy states: "The stack should have explicit ownership of state. Different layers may share data, but they should not compete as equal authorities." It also states: "agent memory, chat history, and ephemeral workflow context must never become the primary source of truth for durable business state."

All five reports enforce this consistently and precisely:

- Report 4: "Make the relational ledger the only place that can answer 'What is the current state of the portfolio?'"
- Report 5: "Provider owns fulfilment truth; you own operational truth."
- Report 6: the Page Registry owns page existence and lifecycle; CMS owns only reusable content blocks; analytics tools own event collection but not experiment governance.
- Report 7: the booking ledger is authoritative for money; analytics events are observational; Search Console is authoritative for SEO performance.
- Report 8: explicit source-of-truth rules for portfolio, publishing, commerce, SEO, and analytics, all mapping to an internal database.

Report 4 explicitly warns against using Notion, Airtable, workflow engines (Temporal), or agent memory as the primary state store. Report 5 warns against letting provider dashboards become the arbitration layer. Report 6 warns against CMS UI becoming the source of page existence truth. These are all direct implementations of the Stack Thesis policy.

### Modularity and replaceability

**Verdict: well-aligned.**

The Stack Thesis, Architecture Principle 2, states: "Components should be separable and replaceable. The company is still refining its market thesis, so the stack must remain adaptable without costly rewrites."

All reports design for replaceability: Report 4 uses PostgreSQL with standard tools (Directus, PostgREST, Metabase) that can be swapped. Report 5 uses a provider-gateway adapter pattern so booking providers can be switched. Report 6 keeps the Page Registry independent of the rendering framework. Report 7 enforces export-by-default so analytics tooling is not a lock-in point. Report 8 explicitly organises the stack as "one internal truth core plus replaceable adapters on the edges."

### Calendar dependence and leverage

**Verdict: well-aligned.**

The Operating Doctrine, Principle 8, states: "A business fails the calendar-control test when revenue depends on constant real-time human availability."

All reports address this:

- Report 4 proposes asynchronous review queues and dashboards rather than meetings.
- Report 5 automates reconciliation and surfaces anomalies as review queues.
- Report 6 makes publishing approvals asynchronous "queue work tied to explicit artefacts, not meetings."
- Report 7 proposes automated "decision packets" that attach evidence to portfolio decisions.
- Report 8 synthesises these into a model where portfolio motion requires less calendar time.

The Portfolio Model's cadence section (weekly/monthly/quarterly reviews) is not explicitly reflected in the reports' implementation recommendations. Report 8's "decision packets" partially address this but do not map to the specific cadence defined in the Portfolio Model.

### Build vs buy

**Verdict: well-aligned.**

The Stack Thesis defines build/buy/delay logic: build when tightly coupled to learning loops or wedge logic; buy when commoditised and replaceable; delay when speculative.

All reports follow this logic consistently:

- Buy: database hosting, admin UI (Directus), dashboards (Metabase), analytics capture (PostHog), rendering framework (Next.js).
- Build: domain schemas, lifecycle state machines, decision rights policy, agent interface contracts, provider gateway, page registry, event taxonomy.
- Delay: full CQRS/event sourcing, multi-provider routing, complex data platforms, multi-brand admin systems.

This maps cleanly to the Stack Thesis's three adoption horizons.

### Observability and auditability

**Verdict: well-aligned.**

The Stack Thesis, Architecture Principle 3, states: "The system should expose what it knows, what it did, what changed, and why."

Report 4 implements audit trails via database triggers and a first-class Decisions table. Report 5 correlates every provider request to internal request IDs, portfolio object IDs, and eventual booking IDs. Report 6 tracks publication runs with diffs. Report 7 designs event envelopes with explicit join keys. Report 8 adds OpenTelemetry correlation across services.

### Stage-appropriate complexity

**Verdict: well-aligned, with one caution.**

The Stack Thesis states: "The stack should avoid... orchestration systems that are more complicated than the workflows they manage." All reports explicitly warn against overbuilding: Report 4 warns against full CQRS/event sourcing early. Report 5 warns against multi-provider routing before evidence justifies it. Report 6 warns against large-scale automated content generation without review gates. Report 7 warns against enterprise "lakehouse" architecture. Report 8 explicitly organises recommendations into "now / later / avoid."

The caution is that Report 8's 30/60/90 plan, while reasonable, introduces a concrete implementation timeline that the core docs deliberately leave open. The Operating Doctrine's "Open Questions" section states these are "not weaknesses in the doctrine. They are the purpose of the doctrine: to govern how those questions are resolved." Report 8 begins resolving them, which is the job of a deep research report, but the plan should be treated as a proposal subject to evidence, not as doctrine.

## Report-by-Report Findings

### deep-research-report-4.md — Portfolio state management

**What aligns well:**

- The "Portfolio Ledger + Decision Log + Evidence Links" architecture directly implements the Stack Thesis's Source Of Truth Policy and the Portfolio Model's decision logging requirements.
- The proposed schema entities (Idea, ResearchTrack, Hypothesis, Experiment, Wedge, Brand, LocationCluster) map closely to the Portfolio Model's Units of Analysis.
- The Decision entity with `proposed_by_actor` (human or agent) and `decided_by_actor` (human only) correctly implements the Portfolio Model's decision rights.
- The Evidence entity with links to hypotheses, experiments, wedges, and decisions supports the Portfolio Model's evidence standards.
- The "thin-core portfolio ledger with thick edges" pattern (agents write proposals and outcomes back to the ledger) is a clean implementation of bounded autonomy.
- The explicit rejection of docs-as-state (Notion), spreadsheet-as-state (Airtable), and workflow-as-state (Temporal) is directly aligned with the Stack Thesis's warning that "agent memory, chat history, and ephemeral workflow context must never become the primary source of truth."

**What is missing:**

- "Portfolio Bet" is not a distinct entity or lifecycle state. The Portfolio Model defines it as Stage 6 with its own purpose ("intentional continuation or scaling") and specific governance questions. Report 4's Wedge lifecycle (`candidate, live, scaling, paused, killed, spun_out`) subsumes this. Adding a `portfolio_bet` state or a separate PortfolioBet entity would better honour the Portfolio Model.
- The Portfolio Model's default limits (8 tracks, 4 experiments, 2 live wedges) are not referenced. The schema does not include a mechanism to enforce or trigger review when limits are exceeded.
- The Portfolio Model's review cadence (weekly/monthly/quarterly) is not reflected.
- Report 4 introduces a `wip_class: enum {explore, validate, scale}` on ResearchTrack. This concept does not appear in any core doc. It is not contradictory, but it adds terminology that has no governing definition.

**What conflicts:**

No material conflicts. The report faithfully implements the core docs' intent.

**What is stronger than the current core docs:**

- The explicit "candidate approaches compared" section (Notion, Git, relational, Airtable/Baserow/NocoDB, graph, workflow engines) provides decision-quality analysis that the Stack Thesis deliberately defers: the Stack Thesis says "which database or structured knowledge layer should be the primary source of truth" is an open question. Report 4 resolves it with clear reasoning.
- The proposed schema is more concrete than anything in the core docs and provides a usable starting point.

**Trust assessment:** Trust as-is, with one annotation: the schema should be patched to include an explicit "Portfolio Bet" lifecycle state or promotion gate before implementation.

### deep-research-report-5.md — Booking and travel API integration

**What aligns well:**

- LiteAPI is treated as "a credible near-term primary provider if and only if you implement it behind a provider gateway with internal transaction state authority." This precisely matches the Working Venture Thesis: "This is not yet a final commitment to LiteAPI as the permanent core. It is the current best candidate for rapid experimentation."
- The provider-gateway adapter pattern implements the Stack Thesis's Architecture Principle 2 (modularity/replaceability) and Principle 5 (clean boundaries between layers).
- The dual-layer data model (static content store vs transactional ledger) maps cleanly to the Stack Thesis's Layer 6 (Product and commerce integration).
- The "provider authoritative for fulfilment vs you authoritative for intent/operations" boundary is a precise operationalisation of the Stack Thesis's Source Of Truth Policy rule that "booking and transaction state should live in the product and commerce layer, with external provider records treated as authoritative where applicable."
- The two-provider bake-off recommendation (LiteAPI + Booking.com) implements the doctrine's Principle 5: "Start with the best available hypothesis, then improve it through evidence."

**What is missing:**

- The report does not explicitly connect its provider-gateway pattern to the Portfolio Model's decision rights. For example: switching the primary provider or changing the payment strategy should presumably require explicit approval per the Portfolio Model's governance rules, but the report frames these as architectural concerns rather than governance concerns.
- No mention of the Portfolio Model's default limits or how booking integration capacity affects how many live wedges can be supported simultaneously.

**What conflicts:**

No material conflicts.

**What is stronger than the current core docs:**

- Idempotency as a first-class design concern is introduced here and is not mentioned in any core doc. This is a real operational requirement for autonomous booking systems and should be considered for inclusion in the Stack Thesis.
- The "revalidation gate before purchase" pattern (prebook step) addresses a booking-specific risk not covered in core docs.
- The reconciliation automation pattern directly reduces calendar dependence in a way the core docs describe abstractly but do not operationalise.
- The distinction between "transaction authority vs decision authority" is more precise than anything in the Stack Thesis and provides a useful mental model.

**Trust assessment:** Trust as-is.

### deep-research-report-6.md — SEO experimentation and programmatic page generation

**What aligns well:**

- The Page Registry as a system of record for page existence, lifecycle, and indexing intent directly implements the Stack Thesis's Source Of Truth Policy: "publishing and deployment state should live in the publishing or deployment layer."
- The anti-spam quality gates (differentiation requirements, promise integrity, indexing discipline, faceted navigation containment, structured data validation, page pruning) are strongly aligned with the doctrine's "What We Avoid" list: "feature accumulation without strategic force" and "infrastructure built mainly to appear advanced."
- The separation of SEO experiments from conversion experiments avoids the complexity confusion the doctrine warns against.
- The "two-tier content model" (stable indexable page body + dynamic availability module) is well-aligned with the venture thesis's emphasis on narrow, high-intent booking promises.
- Template versioning and deterministic generation from approved registry entries support the Stack Thesis's requirement for "fast experiment launch and rollback."

**What is missing:**

- The report does not explicitly reference the Portfolio Model's lifecycle stages for pages. A page is a market-facing artefact that belongs to a wedge, which belongs to a portfolio lifecycle. The connection between page lifecycle (draft, proposed, approved, indexable, retired) and wedge lifecycle (candidate, live, scaling) is implied but not formalised.
- No mention of the Portfolio Model's separation criteria for when pages/sites should become distinct brands vs remaining under one brand.

**What conflicts:**

No material conflicts.

**What is stronger than the current core docs:**

- Google spam policy awareness (scaled content abuse, doorway abuse, thin affiliate risk, keyword stuffing) addresses a real operational risk entirely absent from the core docs. For a travel SEO business, this is not optional knowledge.
- The "Quality Gate" concept for indexable pages (requiring differentiation, promise integrity, indexing discipline) is a concrete implementation pattern that the core docs' "experiments should be bounded, interpretable, and tied to a decision" describes only abstractly.
- The faceted navigation containment strategy addresses a technical risk not mentioned in the core docs.

**Trust assessment:** Trust as-is.

### deep-research-report-7.md — Analytics pipeline for conversion and economics

**What aligns well:**

- The ledger-first principle (booking ledger authoritative for money, analytics events observational) directly implements the Stack Thesis's Source Of Truth Policy: "analytics and event state should live in the event pipeline and analytics store" while "booking and transaction state should live in the product and commerce layer."
- The three-plane model (behaviour, transaction, SEO) maps cleanly to the Stack Thesis's reference architecture: Layer 7 (Analytics, observability, and review) with clear inputs from Layer 6 (Product and commerce) and Layer 5 (Publishing and experimentation).
- Export-by-default (PostHog batch export to Postgres) prevents vendor lock-in, which implements the Stack Thesis's replaceability principle.
- The "decision packets" concept (automated weekly readouts + anomaly queues + evidence links into portfolio decisions) is a concrete implementation of the Portfolio Model's cadence requirement and the doctrine's calendar-dependence reduction.
- The wedge scorecard with SEO, conversion, reliability, and economics panels directly supports the Portfolio Model's promotion criteria.

**What is missing:**

- The report's "decision packets" are described as nightly or weekly automations but are not explicitly mapped to the Portfolio Model's three-tier cadence (weekly for tracks/experiments, monthly for portfolio shape, quarterly for doctrine alignment).
- The Portfolio Model's kill criteria are not directly mapped to analytics thresholds or dashboard alerts.

**What conflicts:**

No material conflicts.

**What is stronger than the current core docs:**

- UK PECR privacy/consent guidance (analytics cookies requiring consent, server-side event capture as mitigation) addresses a compliance dimension entirely absent from the core docs. This is operationally important for a UK-based travel business.
- The minimum event envelope specification (event_id, timestamps, source, schema version, wedge_id, experiment_id, page_id, provider_id, booking_id) provides a concrete implementation pattern that the Stack Thesis describes only as "analytics and event tracking" without specifying what events should look like.
- The "join keys are the architecture" insight — that consistent identity fields across planes are more important than specific tool choices — is a valuable design principle not stated in the core docs.
- The schema drift risk and tracking plan governance (Segment Protocols, Snowplow schemas) addresses a real autonomy risk: as agents emit events, naming and properties drift unless validated. The core docs warn about "agent sprawl without clear jobs or guardrails" but do not extend this to data/event quality.

**Trust assessment:** Trust as-is.

### deep-research-report-8.md — Staged stack recommendation

**What aligns well:**

- The hub-and-spoke architecture (one internal truth core + replaceable adapters) is a faithful synthesis of the Stack Thesis's modular architecture principles.
- The source-of-truth rules for portfolio, publishing, commerce, SEO, and analytics are consistent across all preceding reports and with the Stack Thesis.
- The build-vs-buy summary correctly separates commodity capabilities (buy) from doctrine-encoding capabilities (build) and speculative capabilities (delay).
- The "likely now / likely later / likely custom-build / likely avoid" classification maps to the Stack Thesis's three adoption horizons.
- The explicit warnings against docs-as-state, spreadsheet-as-state, and workflow-as-state are consistent with all other reports and the Stack Thesis.

**What is missing:**

- The Portfolio Model's default limits (8 tracks, 4 experiments, 2 live wedges) are not reflected in the implementation plan.
- The Portfolio Model's review cadence is not explicitly scheduled in the 30/60/90 plan.
- The "exploration loop vs exploitation loop" framing from the Operating Doctrine's Company Shape section is not explicitly referenced. The reports focus heavily on the exploitation loop (deepen the current wedge) and less on how the exploration loop is supported by the proposed stack.

**What conflicts:**

- The "wedge operating system" framing (used in the executive recommendation) introduces language that could imply a more tightly integrated, purpose-built system than the Stack Thesis envisions. The Stack Thesis states: "The stack should not become an identity project. It should remain subordinate to the business question." The "operating system" metaphor risks elevating the stack to an identity. This is a framing concern, not a structural conflict.
- The 30/60/90 implementation plan resolves timing questions that the Operating Doctrine deliberately leaves open in its "Open Questions" section: "which technical architecture best supports autonomous research and execution without excess complexity." This is appropriate for a deep research report (the point of research is to narrow open questions) but should be understood as a proposal, not doctrine.

**What is stronger than the current core docs:**

- The system architecture diagram (hub-and-spoke with PostgreSQL at the centre) is more concrete than anything in the Stack Thesis's reference architecture and provides a useful implementation target.
- The dependency ordering for implementation (portfolio ledger first, then booking gateway, then page registry, then analytics) is a practical insight not derivable from the core docs alone.
- The tension analysis (speed vs explicit state, SEO scale vs spam risk, conversion vs payment complexity, automation vs durable state) identifies real implementation tradeoffs the core docs describe only at a principle level.

**Trust assessment:** Trust with caveats. The 30/60/90 plan is a reasonable proposal but should be validated against actual implementation evidence rather than treated as a fixed schedule. The "wedge operating system" framing should be softened to avoid elevating the stack into an identity project.

## Exact Tensions / Contradictions

### 1. "Portfolio Bet" lifecycle stage omitted from Report 4's schema

**The conflicting idea:** Report 4's Wedge entity uses lifecycle states `{candidate, live, scaling, paused, killed, spun_out}`, which does not include an explicit "portfolio bet" state. The Portfolio Model defines "Portfolio Bet" as Stage 6 — a distinct stage between "Live Wedge" and "Scaled Business or Brand" requiring the company to be "clear about whether the wedge is: part of the main business, a separated wedge under the same brand family, a candidate for a new brand or operating unit."

**Where it appears:** Portfolio Model, "Stage 6: Portfolio Bet" section. Report 4, Wedge entity in the schema.

**Resolution recommendation:** Revise Report 4's schema. Add a `portfolio_bet` state to the Wedge lifecycle enum, or introduce a PortfolioBet entity that wraps a Wedge with additional governance fields (separation decision, brand assignment, resource allocation). This is a schema patch, not a redesign.

### 2. Portfolio default limits not enforced or referenced

**The conflicting idea:** The Portfolio Model specifies "up to 8 active research tracks, up to 4 active experiments, up to 2 live wedges" as default operating caps, with "exceeding them should trigger a conscious review." No report references these limits, and no schema or implementation mechanism enforces them.

**Where it appears:** Portfolio Model, "Early-Phase Default Limits" section. All five reports (by omission).

**Resolution recommendation:** Annotate the reports. The limits are described as defaults that can be revised, so hard enforcement is not required. But the portfolio ledger schema should include a mechanism (database constraint, application-level check, or dashboard alert) to flag when limits are approached or exceeded.

### 3. All reports disclaim lack of access to core doc files

**The conflicting idea:** Each report's opening paragraph states it could not access the core doc files and proceeded from the chat description instead. This means all five reports were aligned to a chat-mediated summary of the doctrine, not to the actual governing documents.

**Where it appears:** Opening paragraphs of Reports 4, 5, 6, 7, and 8.

**Resolution recommendation:** No revision needed, because this audit confirms alignment is strong despite the mediation. However, this disclaimer should be removed or replaced with a note that alignment has been verified by this audit. Future deep research should be conducted with direct file access.

### 4. Report 8 introduces implementation timeline; doctrine leaves timing open

**The conflicting idea:** Report 8 proposes a 30/60/90 day implementation plan. The Operating Doctrine's "Open Questions" section says these are "the purpose of the doctrine: to govern how those questions are resolved." The Stack Thesis says "which database or structured knowledge layer should be the primary source of truth" and other stack questions "remain intentionally unresolved until more business evidence exists."

**Where it appears:** Operating Doctrine, "Open Questions To Be Resolved By Research" section. Stack Thesis, "Open Questions" section. Report 8, "Implementation sequence and staged plan" section.

**Resolution recommendation:** No action needed — this is the expected output of deep research. The plan should be treated as a proposal that the core docs authorise ("to govern how those questions are resolved"), not as a revision to the doctrine. If the 30/60/90 plan is adopted, it should be captured as a separate implementation plan document, not merged into the doctrine or stack thesis.

### 5. Report 8 uses "wedge operating system" framing

**The conflicting idea:** Report 8's executive recommendation describes the target as a "ledger-first, contracts-first 'wedge operating system.'" The Operating Doctrine states: "The stack should not become an identity project. It should remain subordinate to the business question: what is the most valuable narrow promise we can own in a market that rewards it?"

**Where it appears:** Report 8 executive recommendation. Operating Doctrine, "Technology Implications" section.

**Resolution recommendation:** Annotate Report 8. The "operating system" metaphor is useful for conveying the scope of what's being built, but it risks implying the stack is the product. Soften to something like "wedge operating infrastructure" or simply refer to the stack as "the internal system" to remain subordinate to the doctrine's language.

### 6. Review cadence not mapped to implementation

**The conflicting idea:** The Portfolio Model defines a three-tier review cadence: weekly (review active tracks and experiments), monthly (review portfolio shape), quarterly (review doctrine alignment). No report maps its implementation recommendations to this cadence.

**Where it appears:** Portfolio Model, "Cadence" section. All five reports (by omission).

**Resolution recommendation:** Annotate Report 8's implementation plan to include cadence touchpoints. The "decision packets" concept from Report 7 partially addresses this but should be explicitly tied to the Portfolio Model's weekly/monthly/quarterly rhythm.

### 7. Exploration loop underrepresented

**The conflicting idea:** The Operating Doctrine describes the company as a "two-loop system" with an exploration loop (search for better opportunities) and an exploitation loop (deepen the current best wedge). The deep research reports focus heavily on exploitation-loop infrastructure (booking, SEO, analytics, portfolio state for active wedges) and less on how the exploration loop is supported. Market sensing, opportunity generation, and competitor monitoring — which the Stack Thesis lists as required capabilities — are mentioned in passing but are not given dedicated architectural treatment.

**Where it appears:** Operating Doctrine, "Company Shape" section. Stack Thesis, Layer 1 (Data and signals) and Layer 3 (Research and scoring). All five reports (by underrepresentation).

**Resolution recommendation:** This is likely a scope gap rather than a contradiction. The exploration loop may warrant its own deep research report covering market sensing, opportunity scoring, and research workflow automation. No revision to existing reports is needed, but the gap should be acknowledged before treating the report set as complete.

## Recommended Doc Updates

### Update core docs

1. **Stack Thesis — add idempotency as a design principle.** Report 5 introduces idempotency (at booking time and in event ingestion) as a first-class concern. This is operationally important for autonomous systems and is not mentioned in any core doc. The Stack Thesis's Architecture Principles section should include a principle along the lines of: "Critical state-changing operations (especially booking and payment) must be idempotent. The system should be safe to retry without creating duplicate effects."

2. **Stack Thesis — add privacy/consent as an evaluation criterion.** Report 7 raises UK PECR compliance. The Stack Thesis's Technology Evaluation Criteria section does not include privacy, consent, or regulatory compliance. Adding a criterion for "regulatory and privacy fitness" would close this gap.

3. **Portfolio Model — consider adding a note on exploration-loop infrastructure.** The Portfolio Model's "Role of Autonomous Systems" section lists market sensing, opportunity generation, and scoring as legitimate autonomous activities, but the lifecycle and implementation focus is on the path from idea to portfolio bet. A brief note acknowledging that the exploration loop requires its own infrastructure support (data ingestion, scoring models, competitor monitoring) would help prevent underinvestment.

### Annotate deep research reports

1. **Report 4 — annotate that the Wedge schema should include a `portfolio_bet` lifecycle state** to match the Portfolio Model's 7-stage lifecycle.

2. **Report 4 — annotate that the `wip_class` field on ResearchTrack** is a new concept not defined in the core docs. If it is adopted, it should be defined in the Portfolio Model.

3. **Report 8 — annotate that the 30/60/90 plan is a proposal**, not doctrine. It should be validated against implementation evidence and captured in a separate implementation plan document.

4. **Report 8 — annotate that "wedge operating system"** should be softened to avoid elevating the stack to an identity project.

5. **All reports — the opening disclaimers about lacking access to core doc files** should be annotated with a reference to this audit confirming alignment.

### No action needed

- No report needs to be rejected or substantially rewritten.
- No core doc needs to be replaced.
- The terminology differences between reports and core docs (e.g., "Portfolio Ledger" vs "structured state system," "Page Factory" vs the Stack Thesis's publishing layer, "bounded autonomy constitution" vs "explicit rules, clear state, auditability") are stylistic, not substantive. The reports introduce useful named patterns that are consistent with the core docs' intent.

## Final Verdict

**The deep research report set (reports 4-8) is coherent enough to use as the basis for implementation planning.**

All five reports are directionally aligned with the four core docs. The strongest alignment is on source-of-truth boundaries, bounded autonomy, and build-vs-buy discipline. No report materially contradicts the operating doctrine, the portfolio model, the stack thesis, or the working venture thesis.

**No report requires substantial revision before implementation can proceed.** Report 4 should receive a minor schema patch (add "portfolio_bet" to the Wedge lifecycle). Report 8 should be annotated to clarify that its 30/60/90 plan is a proposal and that the "wedge operating system" framing should be softened.

**The core docs should receive minor patches before implementation begins:**

- The Stack Thesis should add idempotency as an architecture principle and privacy/consent as an evaluation criterion.
- The Portfolio Model should acknowledge the exploration-loop infrastructure gap.

**The most important alignment gap is not a contradiction but an omission:** the exploration loop (market sensing, opportunity scoring, competitor monitoring) is underrepresented in the deep research reports. This is a scope gap, not a directional problem. It likely warrants a future deep research report but does not block implementation of the exploitation-loop infrastructure covered by reports 4-8.

**You can proceed to GitHub repo mapping and implementation planning** with confidence that the deep research reports are a sound basis, subject to the minor annotations and patches noted above.
