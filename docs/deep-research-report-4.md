# Portfolio state management for an autonomy-heavy travel wedge venture

## Inputs and constraints

The Project/session does not currently contain the files you listed (e.g., `operating-doctrine-v1.md`, `stack-thesis-and-technology-evaluation-framework-v1.md`, or the GitHub registry/role-map/shortlist/gaps files). I therefore cannot treat them as the source of truth and will proceed using (a) your description of the operating model and (b) external research on durable state, auditability, and governance patterns.

Your stated non-negotiables imply a very specific shape for “portfolio state management”:

A durable, reviewable **system of record** for portfolio entities (ideas → tracks → hypotheses → experiments → wedges/bets/brands/geo clusters), with explicit lifecycle stages, decision rights, approvals, and evidence links; and with a clear separation between (1) durable business state and (2) agent memory / workflow execution state. citeturn9search1turn0search0turn0search2

## Executive recommendation

The strongest “first major stack gap” closure—given your emphasis on bounded autonomy, auditability, replaceability, and low hidden state—is to implement **a database-centred system of record with explicit lifecycle state + an append-only decision/change log**, while keeping docs for doctrine and rationale but **not for durable operational state**.

Concretely, for an early-stage autonomous portfolio system, I recommend:

A **relational system of record** (preferably entity["organization","PostgreSQL","open source database project"]) that enforces identity, constraints, and lifecycle state; paired with (a) a human-friendly admin surface, (b) an API surface designed for agents, and (c) an append-only audit/decision trail that can be replayed and reviewed. The core rationale is: relational constraints + durable transactions reduce hidden state and ambiguity, and an append-only log improves auditability and post-hoc analysis of “how we got here.” citeturn8search0turn8search3turn0search0turn0search4

I also recommend treating most workflow/orchestration systems as **execution substrates**, not as your durable portfolio state store—because they retain histories for execution correctness and debugging, but impose history limits and don’t naturally present “portfolio truth” in a clean, long-lived entity model. citeturn0search2turn12search12turn12search20

## Best early-stage architecture for portfolio state management

**Best early-stage architecture for portfolio state management**  
The pattern that best matches your requirements is:

A “thin-core” **portfolio ledger** (system of record) with explicit domain objects and lifecycle states, and “thick edges” (agents, workflows, scrapers, experiment runners) that must write proposals and outcomes back into that ledger.

### Durable state

Use a relational SOR with:

- **Stable entity identifiers** (UUIDs or ULIDs) for ideas, hypotheses, experiments, wedges, brands, locations, and decisions.
- **Explicit lifecycle fields** (enums/state machines) rather than implicit status hidden in documents or chat.
- **Foreign keys + constraints** so your portfolio graph cannot drift into link rot and inconsistent stage transitions (e.g., an experiment cannot be “promoted” if it has no hypothesis, no owner, or no evidence link). PostgreSQL constraints and foreign keys are designed for exactly this type of integrity enforcement. citeturn8search0turn8search16

Where you need semi-structured fields (e.g., hypothesis assumptions, experiment configs, market notes), prefer JSONB columns **inside the relational store** rather than ejecting the whole model into documents—this keeps joinable identity and constraints while allowing flexible schemas. PostgreSQL supports `json`/`jsonb` as first-class types with query support. citeturn0search7turn0search15

### Auditability and decision trace

Add two layers of history:

- **A first-class Decisions table** (domain-level governance log): who decided what, when, under which decision right, with linked evidence and a structured rationale.
- **A change audit trail** (mechanics-level audit): capture inserts/updates/deletes automatically into an append-only audit table. PostgreSQL’s documentation includes canonical examples using triggers to stamp the acting user/time/op type into an audit table. citeturn8search3turn8search15

This gives you: (1) human-legible governance history and (2) forensic-grade mutation history—without relying on “agent memory” as the durable record.

### Human review surfaces

For low calendar dependence, the “review loop” must be asynchronous and legible. That implies at least two read/write surfaces:

- A structured admin/editor UI for portfolio records (create/edit/approve, attach evidence, review stage gates).
- A read-only “portfolio review” view (dashboards and queues: what needs approval, what’s stale, what’s failing, what’s ready to promote/kill).

Early-stage, it is usually lower-maintenance to **connect an off-the-shelf admin layer to the database** than to custom-build UIs. For example, entity["company","Directus","open source data platform"] positions itself as providing APIs, auth, and admin tooling when you connect a database, and its open-source project describes “a real-time API and App dashboard for managing SQL database content.” citeturn6search3turn6search5turn6search10

For asynchronous human review, entity["company","Metabase","open source bi tool"] is explicitly designed as a querying and dashboard layer on top of your database and documents how to connect/manage database connections. citeturn1search9turn1search12turn1search6

### Agent and workflow interaction model

Agents should not “remember the portfolio.” They should:

1. Read portfolio state via an API/query layer.
2. Propose changes (create hypotheses/experiments, attach evidence, propose stage changes).
3. Await approval where required.
4. Commit outcomes and artefacts back into the ledger.

For an “API-first database” approach, entity["organization","PostgREST","postgres to rest server"] is a canonical example: it turns a PostgreSQL schema into a REST API where the database structure/constraints/permissions determine endpoints and operations. citeturn12search7turn1search2turn12search11

This pairing—database SOR + generated API + admin UI—very directly supports bounded autonomy: agents can operate at high throughput, but approvals and state transitions remain explicit, reviewable, and enforceable at the data layer.

### Source-of-truth design recommendation

**Source-of-truth design recommendation**  
Make the relational ledger the *only* place that can answer “What is the current state of the portfolio?” and “What is the latest approved decision?” Everything else (docs, chat, workflow histories, agent memory) should be supporting context and execution traces, not authoritative state.

This aligns with the “system of record” concept: an authoritative source for a business domain/process. citeturn9search1turn9search7

## Best later-stage evolution path

**Best later-stage evolution path**  
Once you have multiple wedges, active brands, and higher automation throughput, the typical evolution is: keep the SOR stable, and add projections, event logs, separation boundaries, and observability—not to replace the database ledger, but to scale autonomy safely.

### Add an event stream (selectively), not blanket event sourcing

Full event sourcing stores all changes as a sequence of events and can reconstruct past states by replaying events, which is powerful for audit and “time travel.” entity["people","Martin Fowler","software engineer author"] describes event sourcing as storing state changes as a sequence of events, and entity["company","Microsoft","technology company"]’s architecture guidance emphasises append-only event storage as an audit trail and the ability to regenerate state by replaying events. citeturn0search0turn0search4

However, blanket event sourcing early often creates complexity. A pragmatic evolution path is:

- Keep the relational ledger as the operational truth.
- Add an **append-only domain event table or stream** (e.g., “HypothesisProposed”, “ExperimentCompleted”, “WedgePromoted”) for downstream automation, analytics, and explainability.
- Materialise read models (dashboards/queues) from that event table if needed.

Avoid enabling full CQRS/event-sourced architecture until the domain stabilises. Fowler’s CQRS note explicitly warns that CQRS “adds risky complexity” for most systems. citeturn9search0

### Stronger multi-brand / multi-wedge separation

Early-stage, you can represent brand/wedge separation as rows and foreign keys (brand_id, wedge_id) with optional row-level access controls. PostgreSQL supports row-level security policies restricting which rows can be selected/inserted/updated/deleted per user. citeturn8search1turn8search5

Later-stage, as wedges harden into “semi-independent businesses,” you can split along explicit boundaries:

- Separate schemas or separate databases per brand (depending on operational and compliance needs).
- Use logical replication for controlled migration/splitting: PostgreSQL documentation defines logical replication as replicating data objects and their changes based on replication identity (usually primary keys). citeturn8search2
- For streaming changefeeds into analytics or other systems, PostgreSQL’s logical decoding infrastructure can stream modifications for use cases including auditing. citeturn8search6

This gives a clean “separation lever” later without redesigning your core object model.

### Observability and “explainability of autonomy”

As autonomy increases, you will need to observe agent actions and workflow behaviour independently of portfolio state.

entity["organization","OpenTelemetry","observability open standard"] defines itself as an observability framework/toolkit for generating/exporting/collecting telemetry (traces, metrics, logs). citeturn3search5turn3search2

A later-stage pattern is:

- Use OpenTelemetry instrumentation in all agents/workers.
- Correlate workflow runs with portfolio entity IDs (idea_id, experiment_id, wedge_id).
- Store structured run logs separately from the portfolio ledger, but always link back by IDs.

### Evidence and analytics hardening

If you eventually treat evidence as “first-class” (metric definitions, validation, automated checks), adopt data testing and documentation tools only when they pay for their operational weight.

For example, entity["company","dbt Labs","analytics engineering company"] documents built-in data tests such as `unique`, `not_null`, `accepted_values`, and `relationships`, and positions tests as a way to make assumptions explicit and continuously validated. citeturn11search8turn11search4

Similarly, entity["organization","Great Expectations","data quality framework"] defines an “Expectation” as a verifiable assertion about data meant to make implicit assumptions explicit. citeturn11search6

The key is not the tools themselves, but the architectural rule: evidence links in the portfolio ledger should point to reproducible artefacts (dashboards, queries, validation outputs) rather than copying ephemeral screenshots into docs.

## Candidate approaches compared

**Candidate approaches compared**  
Below is a decision-oriented comparison against your criteria (explicit state, auditability, bounded autonomy, human review, replaceability, low hidden state).

### Notion / docs-as-state

Notion databases are “collections of pages,” which is excellent for narrative context but tends to blur operational state with prose. citeturn2search20

Notion does have audit log and export capabilities in some workspace configurations: Notion’s help documents audit log access and CSV export, and it also supports exporting content as Markdown & CSV. citeturn12search1turn12search5

But for autonomy-heavy operations, you’ll hit limitations typical of doc-centric state:

- The Notion API has strict request limits (Notion documents an average of 3 requests per second per integration). citeturn10search0
- Notion’s developer docs include specific data API constraints (e.g., database/data source interactions and limitations). citeturn2search24turn10search20
- “Approval workflow + integrity constraints” is not what docs are optimised for; you can approximate it, but it is easy to end up with clever-but-opaque conventions.

Bottom line: Notion can be a strong *supporting* knowledge base and decision narrative layer, but it is fragile as the primary durable portfolio state store when agents will be updating state at scale.

### Markdown / git-based state

Git provides a strong, developer-native audit trail mechanism: the Git book describes commits as recording a “permanent snapshot,” and also documents that history can be rewritten via tools like rebase—meaning auditability depends on governance (protected branches, enforced PR review, signed commits) rather than on Git alone. citeturn5search4turn5search2turn5search11

Git-based state can be excellent when:

- The state is naturally file-shaped (ADR docs, doctrine, schemas, configs).
- Updates are infrequent and review-by-PR is desired.

It becomes painful when:

- Many actors (including agents) need frequent writes.
- You need concurrent edits, conflict resolution, and transaction semantics.

So: keep doctrine and decision records in Git (high value); avoid using Git as the operational state store for high-frequency portfolio entities unless you strongly constrain write paths.

### Relational databases with admin UI

This is the most reliable pattern for your “explicit durable state” requirement:

- Constraints/foreign keys enforce integrity. citeturn8search0turn8search16
- Row-level security exists if/when you need multi-brand controls. citeturn8search1
- Audit trails can be implemented at the database layer (trigger-based auditing examples are explicitly documented). citeturn8search3
- Semi-structured flexibility exists via JSON/JSONB. citeturn0search7

The main tradeoff is that you must design a schema and a human workflow, but this is also exactly where your strategic control and “no hidden state” goals live.

### Airtable / Baserow / NocoDB and similar

This family gives you fast “structured-ish state” with strong human usability, but with governance/scale caveats.

Airtable provides record-level revision history in an activity feed and who-changed-what-when visibility, and it documents API rate limits (5 requests/sec per base). citeturn12search2turn10search1turn10search5

Baserow positions itself as an open-source Airtable alternative and documents that it auto-generates REST API documentation per database, with token-based auth and table-level permissions. citeturn2search4turn10search2

NocoDB describes an “intuitive spreadsheet interface” and the ability to connect to Postgres/MySQL, and documents REST APIs as a primary programmatic access method. citeturn2search1turn10search3turn10search19

Tradeoff summary:

- Best when you need immediate operator usability and lightweight structure.
- Risky when you need strong constraints, complex lifecycle enforcement, and long-term replaceability (proprietary SaaS lock-in for Airtable; operational burden for self-hosting; and “spreadsheet gravity” that can reintroduce hidden state via ad-hoc fields and conventions).

A common autonomy-compatible pattern is to use these tools as **front-ends** to a relational store (or as transitional scaffolding), rather than letting them become the irreversible core.

### Graph-oriented approaches

Graph databases and RDF knowledge graphs shine when relationship traversal is the core workload.

entity["company","Neo4j","graph database company"] describes graph database concepts in terms of nodes, relationships, labels, and properties. citeturn4search9turn4search3  
entity["organization","W3C","web standards body"]’s RDF concepts/specs define RDF graphs/datasets as a way to represent information as directed labelled graphs. citeturn4search1turn4search7

For your problem, graphs are appealing for “idea ↔ evidence ↔ geo cluster ↔ brand ↔ wedge” navigation. The tradeoff is operational complexity and human legibility: lifecycle enforcement, approvals, and audit trails are usually easier to implement and review in relational systems. Graphs are often best introduced later as a **derived index** for exploration, not as the primary ledger.

### Workflow/orchestration tools pretending to be state systems

This is a critical anti-trap for your operating model.

entity["company","Temporal","workflow orchestration platform"] stores a durable event history for workflow executions and explicitly documents event history limits (warnings after 10,240 events; termination at 51,200 events; also size limits). citeturn12search12turn12search20turn0search6

That is exactly what you want for reliable execution, retries, and replay—but it is **not** what you want as the durable business portfolio ledger. Treat workflow histories as execution traces linked to portfolio entities, not as the place your business state “lives.”

Similarly, if you rely on automation platforms as core state stores, you inherit their security and operational risks. For example, the NVD and GitHub advisory database document critical remote command execution vulnerabilities in entity["company","n8n","workflow automation platform"] affecting versions prior to patched releases (CVE-2026-25049; and earlier CVE-2025-68613). citeturn7search1turn7search3turn7search5  
(These can be managed with patching and access controls, but they illustrate why workflow systems should not be your core ledger.)

### Custom internal tooling

Custom tooling becomes justified when:

- The schema is stable enough that you’re not constantly rebuilding.
- You have repeated high-value workflows (promotion/kill gates, evidence checks, brand separation steps).
- You need a bespoke review experience for strategic control.

But custom tooling is usually *not* the correct first move for the ledger itself; the “custom” part should sit above a durable relational ledger, not replace it.

## Recommended tools / systems / patterns

This section focuses on “combinations” that satisfy your criteria and keep the system legible.

### Recommended core pattern

A “Portfolio Ledger + Decision Log + Evidence Links” architecture:

- **Portfolio ledger:** PostgreSQL schema as the source of truth for entities, lifecycle stages, owners, and references.
- **Generated (or thin) API layer for agents:** PostgREST-style database-driven API generation reduces boilerplate, and the database remains the policy/constraint boundary. citeturn12search7turn12search11
- **Admin/editor UI:** Directus-style “connect your DB, get admin tooling + APIs” reduces early maintenance burden while keeping replaceability (you keep your database). citeturn6search3turn6search5
- **Review dashboards:** Metabase for portfolio review, queues, gate readiness, and evidence completeness. citeturn1search9turn1search12
- **Change audit:** PostgreSQL trigger-based audit tables (or logical decoding later) for immutable-ish mutation history. citeturn8search3turn8search6

### A strong “managed Postgres” variant

If you want to reduce DevOps overhead while staying replaceable, entity["company","Supabase","postgres dev platform"] provides “a full Postgres database for every project” plus backups and other platform features, and also positions itself as an open-source backend platform running on Postgres. citeturn1search13turn1search7turn1search10

This can be a pragmatic early implementation choice: your core SOR remains Postgres (portable), while you offload operational scaffolding.

### Decision logging pattern

For durable strategic control, adopt ADR-style decision records for “why,” not “what,” and link them to the ledger.

The ADR practice is widely documented; the classic description frames an ADR as a short text file capturing a decision’s context and consequences, often stored in-repo. entity["people","Michael Nygard","software architect"] is commonly credited with popularising the practice; for example, entity["company","Cognitect","software company"]’s post describes ADRs as short text files capturing forces and a decision, stored under a repository directory. citeturn11search1turn0search17turn0search5

A key integration move for your venture is: **every promotion/pause/kill decision should have both** (a) a structured decision record in the database and (b) an ADR (or ADR-like) narrative that explains the reasoning, tradeoffs, and evidence.

### Observability pattern

Instrument agents/workers with OpenTelemetry and attach portfolio IDs (experiment_id, wedge_id) to logs/traces so you can answer: “Which agent action changed which portfolio state, and why?” OpenTelemetry explicitly targets correlated telemetry across traces/metrics/logs. citeturn3search5turn3search2

## Governance, approvals, build vs buy, and risks

**Suggested approval / decision-rights model integration**  
Your portfolio system should treat approvals as first-class state transitions, not Slack messages.

A governance pattern that maps well to “bounded autonomy” is a light stage-gate approach: ideas and experiments move through explicit stages and “gates” where decisions are made against criteria. The Stage-Gate model is positioned as a disciplined roadmap for turning ideas into outcomes. citeturn3search0

Translate that into your schema:

- Each entity has a lifecycle state (e.g., `draft → proposed → active → paused → killed`).
- Certain transitions require approvals; approvals are objects with approver identity, timestamp, and scope.
- “Decision rights” are explicit: which role (human) can approve which transition under which conditions (e.g., spend cap, brand risk, compliance exposure).

For higher-stakes transitions (e.g., “promote to live wedge”, “spin out brand”), adopt a “four eyes” control where at least two people must review/approve critical actions. The four-eyes principle is widely described as dual-control approval for critical actions. citeturn3search1turn3search19

**Build vs buy analysis**  
What should be bought/reused early:

- The database engine and hosting (Postgres; potentially managed platforms like Supabase). citeturn1search13turn8search0
- Admin/editor UI that sits on top of your DB (Directus-like) to avoid custom UI drag. citeturn6search3turn6search5
- Dashboard layer for review (Metabase). citeturn1search9turn1search12

What should likely be custom-built (because it encodes your doctrine/strategy):

- The domain schema (objects, lifecycle states, invariants).
- The state transition rules and approval policy (the “bounded autonomy constitution”).
- The agent interface contract (what agents can propose vs execute; how they attach evidence; how runs are linked and audited).

**Risks, lock-in, and maintenance concerns**  
High-probability risks to actively mitigate:

- **Docs-as-state drift:** Notion-style systems excel at narrative but are prone to implicit state and convention-heavy workflows. Even if audit logs/export exist, the API has strict request limits, which can constrain agent-heavy automation. citeturn2search20turn10search0turn12search1
- **Spreadsheet gravity:** Airtable-style systems can become de facto truth because they’re usable, but you inherit rate limits and weaker constraint enforcement at scale. citeturn10search1turn12search2
- **Workflow-as-ledger:** workflow engines retain durable execution history but have strong limits and are not designed to express a long-lived portfolio domain as a clean entity model. citeturn12search12turn12search20
- **Security/ops exposure in automation platforms:** tools that execute expressions and connect many credentials can be high-impact when vulnerable; recent n8n CVEs illustrate the category risk. citeturn7search1turn7search3turn7search5
- **Over-architecting early:** CQRS/event sourcing can be powerful, but can introduce avoidable complexity before the domain stabilises. citeturn9search0turn0search0

## Suggested next experiment or implementation path

**Suggested minimal schema / object model for this venture**  
Below is a minimal, autonomy-friendly object model that keeps portfolio state explicit, reviewable, and enforceable. It is intentionally small but “extensible without rewrite.”

```yaml
# Core entities (system of record)
Idea:
  id: uuid
  title: string
  source: enum|string          # e.g., "market scan", "competitor", "agent discovery"
  thesis_link: url|null
  status: enum {inbox, triaged, parked, rejected, promoted_to_track}
  created_at, updated_at
  owner_id: uuid|null

ResearchTrack:
  id: uuid
  idea_id: uuid|null
  scope: string                # market / segment / geo / channel
  status: enum {proposed, active, paused, closed}
  owner_id: uuid
  wip_class: enum {explore, validate, scale}
  created_at, updated_at

Hypothesis:
  id: uuid
  track_id: uuid
  statement: text
  assumptions: jsonb
  expected_signal: text
  falsification_criteria: text
  status: enum {draft, proposed, approved, rejected, retired}
  created_at, updated_at

Experiment:
  id: uuid
  hypothesis_id: uuid
  design: jsonb                # bounded plan, budget cap, duration cap, traffic cap
  run_status: enum {queued, running, stopped, completed, invalidated}
  result_status: enum {inconclusive, negative, positive, needs_followup}
  evidence_bundle_id: uuid|null
  created_at, updated_at

Wedge:
  id: uuid
  name: string
  description: text
  origin_track_id: uuid|null
  lifecycle: enum {candidate, live, scaling, paused, killed, spun_out}
  guardrails: jsonb            # budgets, compliance constraints, brand constraints
  owner_id: uuid
  created_at, updated_at

Brand:
  id: uuid
  name: string
  lifecycle: enum {sandbox, live, scaling, paused, retired}
  created_at, updated_at

LocationCluster:
  id: uuid
  label: string
  definition: jsonb            # cities, destination types, heuristics
  created_at, updated_at

# Governance and traceability
Decision:
  id: uuid
  decision_type: enum {promote, pause, kill, spin_out, budget_change, scope_change}
  target_type: enum {idea, track, hypothesis, experiment, wedge, brand, location_cluster}
  target_id: uuid
  proposed_by_actor: {type: enum{human, agent}, id: string}
  decided_by_actor: {type: enum{human}, id: string}
  decision_right: string       # e.g. "portfolio steward", "brand owner"
  outcome: enum {approved, rejected, superseded}
  rationale: text
  adr_ref: string|null         # e.g. path or id in Git
  created_at, decided_at

Approval:
  id: uuid
  decision_id: uuid
  approver_id: uuid
  approval_role: string
  verdict: enum {approve, reject}
  note: text|null
  created_at

Evidence:
  id: uuid
  entity_type: enum {hypothesis, experiment, wedge, decision}
  entity_id: uuid
  kind: enum {dashboard, query, doc, dataset, run_log, artifact}
  uri: string
  summary: text
  created_at

AuditEvent:
  id: uuid
  table_name: string
  row_id: uuid
  op: enum {insert, update, delete}
  actor: jsonb                 # human/agent identifier
  at: timestamp
  diff: jsonb                  # optional change diff
```

This structure reflects three research-backed principles:

- Relational constraints and foreign keys prevent drift and undefined state. citeturn8search0turn8search16
- JSON/JSONB preserves flexibility for evolving elements (assumptions, experiment design) without losing joinable identity. citeturn0search7
- Trigger/log-based auditing is a known approach for recording inserts/updates/deletes for audit trails. citeturn8search3turn0search4

**Suggested next experiment or implementation path**  
Run a “thin vertical slice” implementation that proves the system’s governance and autonomy properties before you scale scope:

1. Implement the minimal schema for: Idea → Track → Hypothesis → Experiment → Decision/Approval (+ Evidence links).
2. Build one automated agent workflow that:
   - pulls a Track,
   - proposes a Hypothesis,
   - creates an Experiment with explicit guardrails,
   - writes state updates back to the ledger,
   - halts at an approval gate,
   - and, once approved, executes and posts an evidence bundle.
3. Add a weekly asynchronous portfolio review dashboard/queue (“needs approval”, “stale tracks”, “experiments finished but not decided”) in Metabase-style tooling. citeturn1search9turn1search12
4. Add database-level audit events (trigger-based) for the small set of tables that matter most (Decisions, Approvals, Wedges). citeturn8search3
5. Instrument the agent/workflow with OpenTelemetry and include entity IDs on traces/logs. citeturn3search5turn3search2

**Clear final classification**

- **Likely now**
  - Relational ledger as the portfolio system of record (Postgres).
  - Explicit lifecycle states + constraints/foreign keys.
  - First-class Decisions + Approvals + Evidence links.
  - Audit trail at the database layer for critical tables (trigger-based).
  - Admin/editor UI connected to the database; dashboards for asynchronous review. citeturn8search0turn8search3turn6search3turn1search12

- **Likely later**
  - Selective event stream/domain events for replayable autonomy and projections (not full event sourcing on day one). citeturn0search0turn0search4
  - Stronger multi-brand separation via RLS, then schema/db split enabled by logical replication/logical decoding when needed. citeturn8search1turn8search2turn8search6
  - Dedicated observability stack standardised on OpenTelemetry correlations. citeturn3search5turn3search2
  - Formalised evidence pipelines and automated data tests (dbt / Great Expectations class) when the volume of experiments makes manual evidence validation a bottleneck. citeturn11search8turn11search6

- **Likely custom-build**
  - The portfolio domain model, lifecycle state machines, invariants (what must be true to promote/kill/spin out).
  - Decision rights policy (who approves what, under what guardrails) and how that policy is enforced at write-time.
  - Agent contracts: proposal vs execution boundaries, and the “write back to ledger” discipline.

- **Likely avoid**
  - Docs (Notion) as the *primary* durable operational state store for a high-autonomy portfolio (keep it for doctrine and narrative, not truth). citeturn2search20turn10search0
  - Using orchestration/workflow history as the portfolio ledger (“workflow-as-state”), due to history limits and mismatch with durable domain modelling. citeturn12search12turn12search20
  - Over-committing early to full CQRS/event sourcing before your domain stabilises. citeturn9search0