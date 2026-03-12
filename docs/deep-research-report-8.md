# Staged stack recommendation for an autonomy-heavy travel wedge venture

## Executive recommendation and recommended near-term stack

The Project/session does not currently contain the documents you listed (including `operating-doctrine-v1.md`, `stack-thesis-and-technology-evaluation-framework-v1.md`, and `deep-research-report-4.md` through `deep-research-report-7.md`). As a result, I cannot use them as source-of-truth inputs or reconcile conflicts inside those files directly, and this synthesis instead reconciles the *prior deep-research conclusions as expressed in this chat* and anchors stack decisions to primary/official sources where possible. citeturn0search13turn1search0turn6search5turn2search3turn0search3

**Executive recommendation (decision-quality):** build a **ledger-first, contracts-first “wedge operating system”** with four explicitly-bounded layers—portfolio, commerce, publishing, and analytics—where durable state lives in a database you control and vendors are treated as replaceable adapters.

In practice, the best “near-term stack” that balances speed-to-experiment with autonomy, auditability, replaceability, and low hidden state is:

- **Core system-of-record (durable state):** entity["organization","PostgreSQL","relational database"] as your single durable store for portfolio state, publishing registry state, and commerce/booking ledger state, with constraints, JSON support where needed, and an explicit audit trail. citeturn2search3turn2search1turn2search2turn3search0  
- **Human review + admin surface:** entity["company","Directus","open-source data platform"] connected to your database to provide a visible, role-based admin UI and APIs without inventing a custom back-office immediately. citeturn3search6turn3search14turn3search2  
- **Agent/workflow API surface:** entity["organization","PostgREST","postgres-to-rest server"] (or a thin bespoke API) so that database constraints/permissions remain the policy boundary and the API stays replaceable. citeturn3search4turn3search13  
- **Booking integration (primary provider behind a gateway):** entity["company","LiteAPI","travel api provider"] as primary “go live quickly” supply (search → rates → prebook → book → cancel → reconcile), integrated strictly behind your own Provider Gateway and internal booking ledger. citeturn5search0turn7search0turn7search1turn0search1turn0search29  
- **Booking de-risk / escape hatch:** entity["company","Booking.com","online travel company"] Demand API as the most strategically relevant comparator/secondary integration because it supports search and booking/order management endpoints and has explicit payments guidance for UK/EEA flows (including SCA/PSP token requirements). citeturn0search6turn0search38turn0search22turn7search2turn5search5  
- **SEO publishing runtime:** Next.js (framework-first) using Incremental Static Regeneration (ISR) / on-demand regeneration, driven by an internal Page Registry in your database so “page existence” never lives only inside a CMS UI. citeturn1search0turn1search4  
- **SEO safety rails:** follow Google’s spam policies and technical indexing guidance (scaled content abuse, doorway risk, faceted navigation crawl traps, testing best practices, noindex/robots rules, sitemap limits). citeturn0search3turn1search2turn1search30turn5search3turn5search7turn6search0  
- **Behaviour + funnel analytics (with “export-by-default”):** entity["company","PostHog","product analytics platform"] for immediate funnel insight plus batch exports to your controlled database schema so analytics never becomes vendor-locked business truth. citeturn6search5turn1search3turn1search15turn6search2  
- **Decision dashboards:** entity["company","Metabase","business intelligence tool"] connected directly to your database for wedge scorecards and promotion/pause/kill readiness dashboards. citeturn4search4turn4search12  
- **Observability (not “analytics”):** entity["organization","OpenTelemetry","observability framework"] for correlated traces/logs/metrics across agents, publishing runs, and booking gateway calls, linked by wedge/page/booking IDs. citeturn4search7turn4search3  

This set is intentionally opinionated: it concentrates durable state in one place (Postgres), provides immediate “human readability” via Directus/Metabase, enables autonomy through strict API contracts, and keeps vendor systems replaceable by ensuring exports and internal ledgers exist from the start. citeturn2search3turn3search6turn4search4turn7search0turn1search3

## Recommended later-stage evolution path

Your evolution path should preserve the same *state boundaries and contracts*, and add scale and separation only when proven wedges and higher booking volume force it.

**Phase after the first real wedge experiments (single wedge, learned constraints):**
- Keep one booking provider primary, but finish the “escape hatch” thin slice for a second provider so switching risk is bounded. citeturn0search38turn7search0  
- Keep SEO page volume deliberately constrained and governed; expand via page cohorts only when pages demonstrably provide value and don’t resemble scaled or doorway patterns. citeturn0search3  
- Convert ad-hoc reporting into “decision packets” (automated weekly wedge readouts + anomaly queues) so portfolio motion requires less calendar time.

**Phase with multiple live wedges (portfolio discipline becomes the bottleneck):**
- Introduce row-level controls and per-wedge “namespacing” in your database to reduce cross-wedge interference and prepare for multi-brand. Row security policies are built into PostgreSQL and can be enabled per table. citeturn3search0turn3search3  
- Upgrade analytics modelling: introduce dbt transformations and tests to keep event → ledger joins reliable as the event taxonomy grows; dbt ships with generic tests like `unique`, `not_null`, `accepted_values`, and `relationships`. citeturn4search10turn4search6  
- Add stricter event governance if multiple teams/agents emit analytics events: consider schema validation patterns like Snowplow’s self-describing schemas or governance layers like Twilio Segment Protocols (only if the operational overhead is justified). citeturn8search8turn8search12turn8search21turn8search9  

**Phase with stronger portfolio and multi-brand operation:**
- Split along boundaries **without rewriting the core**:
  - Use PostgreSQL logical replication and/or logical decoding to separate brand/wedge data into new databases while preserving history and operational continuity. PostgreSQL documents logical replication as replicating data objects and changes based on replication identity, and logical decoding as extracting persistent changes from WAL into interpretable formats. citeturn11search3turn11search4turn11search16  
- Make provider routing a first-class capability only when you have evidence it increases booking reliability or coverage; otherwise keep it simple (one provider per wedge) to avoid “clever but opaque” supply logic. citeturn7search0turn7search1  
- Formalise “operational autonomy” guardrails: anomaly monitors, auto-pause/auto-prune rules, and explicit approvals for risky changes (provider switch, payment method changes, mass page publication). citeturn5search3turn0search3  

## System architecture overview

The cleanest reconciled architecture is a hub-and-spoke: **one internal truth core** plus replaceable adapters on the edges.

A useful mental model is:

```text
                        ┌───────────────────────────────┐
                        │      Portfolio Ledger         │
                        │ (ideas→tracks→hypotheses→...)  │
                        └───────────────┬───────────────┘
                                        │
                                        │ (wedge_id, experiment_id)
                                        ▼
┌───────────────────────┐     ┌──────────────────────────┐     ┌───────────────────────┐
│   Publishing System    │     │      Commerce Gateway     │     │   Analytics Pipeline   │
│  (Page Factory)        │     │ (Provider adapter layer)  │     │  (Events + SEO imports)│
│  Next.js + Page Registry│     │ LiteAPI/Booking.com etc  │     │ PostHog + exports + BI │
└──────────────┬────────┘     └──────────────┬───────────┘     └──────────────┬────────┘
               │                              │                                  │
               │ (page_id, template_version)  │ (provider_request_id, booking_id)│
               ▼                              ▼                                  ▼
          ┌──────────────────────────────────────────────────────────────────────────┐
          │                      Internal Data Plane (PostgreSQL)                    │
          │  schemas: portfolio | publishing | commerce | analytics_marts | audit     │
          └──────────────────────────────────────────────────────────────────────────┘

Edges: Search Console (SEO truth), Providers (fulfilment truth), Observability (OpenTelemetry)
```

This architecture is coherent with four key technical facts from the underlying tools:

- PostgreSQL supports constraints and referential integrity mechanisms that let you enforce lifecycle invariants and prevent “ghost state.” citeturn2search3turn2search0  
- PostgreSQL supports `json`/`jsonb` types so you can keep semi-structured fields *inside* the relational system-of-record instead of ejecting state into documents. citeturn2search1  
- PostgREST turns a PostgreSQL schema into a REST API where structural constraints and permissions in the database determine API operations, which aligns with “policy in the data layer.” citeturn3search4turn3search13  
- Directus connects to your database and provides a Studio (admin UI) and integrated API with role-based access control, supporting human review without hiding state inside SaaS-only dashboards. citeturn3search6turn3search14  

## Source-of-truth and state-boundary design

This is the most important synthesis point: the stack only works if “truth” is explicit and not spread across vendor dashboards, chat memory, or workflow histories.

### Clear source-of-truth rules

**Portfolio truth (ideas, tracks, hypotheses, experiments, wedges, decisions):**
- Truth lives in the internal database (portfolio schema) with constraints. Foreign keys, uniqueness, and similar constraints are first-class features in PostgreSQL. citeturn2search3turn2search0  

**Publishing truth (what pages exist, indexing intent, template version, experiment variant):**
- Truth lives in the internal database (publishing schema) as a Page Registry.  
- Next.js ISR/on-demand regeneration is a delivery strategy; it is not your source of truth for which pages are “real.” citeturn1search0turn1search4  

**Commerce truth (bookings, cancellations, money, and operational status):**
- Truth lives in your internal commerce ledger *plus provider reconciliation sync jobs*. LiteAPI explicitly provides a reconciliation endpoint to query bookings by date range and track confirm/cancel status. citeturn0search1turn7search19  
- Provider is authoritative for fulfilment responses (e.g., booking confirmation code, final cancellation outcome), but your ledger is authoritative for “what we attempted,” “what we showed,” “who approved,” and “what we believe the state is now.” citeturn7search1turn0search29  

**SEO performance truth (impressions/clicks/CTR/position):**
- Truth comes from Google Search Console’s Performance data. Google documents the meaning of clicks/impressions/CTR/position and exposes this data via `searchanalytics.query()`. citeturn6search4turn6search14turn6search6  

**Analytics truth (funnels, wedge comparisons, reliability):**
- Raw behavioural events are observational and should be stored with export-by-default so they remain portable and auditable. PostHog documents event capture and supports batch exports to controlled destinations like Postgres. citeturn6search5turn1search3turn1search15  

### State boundaries that prevent hidden coupling

**Do not treat orchestration history as business state.**  
Temporal explicitly limits workflow event history (e.g., warns after 10,240 events; limit at 51,200 events / 50MB), which is fine for execution correctness but makes it unsuitable as a durable portfolio database. citeturn8search6turn8search10  

**Enforce idempotency and deduplication at booking and ledger boundaries.**  
LiteAPI’s booking flow includes a client reference for tracking/deduplication; the broader HTTP ecosystem also codifies idempotency keys as a method to make non-idempotent methods fault-tolerant. citeturn7search13turn8search3  

**Treat SEO indexability as governed state, not a byproduct of page generation.**  
Google’s spam policies explicitly warn against scaled content abuse, and its guidance on faceted navigation highlights overcrawling and slower discovery crawls. This implies you should have explicit “index intent” per page class and avoid creating infinite URL spaces via filters. citeturn0search3turn1search2turn1search6  

## Build vs buy summary

This synthesis resolves a common tension: to move fast you will be tempted to “buy dashboards,” but your autonomy and auditability requirements imply you must own the durable state and abstractions.

### Likely buy/reuse in the near term

- Database engine and hosting-managed reliability (e.g., Supabase) while still retaining PostgreSQL portability; Supabase states every project is a full Postgres database and that Postgres is the core (not abstracted). citeturn4search1turn4search26  
- Admin UI and instant APIs (Directus) rather than bespoke back office from day one. citeturn3search6turn3search14  
- Product analytics tooling (PostHog) **only if** it exports to a store you control; PostHog documents both event capture and batch exports (including Postgres destination requirements). citeturn6search5turn1search3turn1search15  
- BI dashboards (Metabase) rather than building reporting UIs early. citeturn4search4turn4search12  

### Likely custom-build in the near term

- The **canonical domain models** and schemas for:
  - portfolio objects and decision rights,
  - page registry and experiment registry,
  - booking ledger and provider gateway contract,
  - event taxonomy and join keys.
- The “bounded autonomy constitution”: which actions require approval, what evidence is required, what thresholds trigger promotion/pause/kill.

These should be treated as your core differentiating operating system.

### Likely postpone until later (to avoid overbuilding)

- Full multi-provider routing and complex supply optimiser logic; start with one provider behind a clean gateway and add switching capacity via a second integration after you have real failure/coverage evidence. citeturn5search25turn7search0turn0search38  
- Warehouse-first behavioural pipelines unless you hit scale/governance triggers; you can adopt schema-governed event systems (Snowplow-style) later if needed. citeturn8search8turn8search12  
- Fully custom publishing platforms; use framework-first publishing and a Page Registry to remain safe and fast. citeturn1search0turn0search3  

## Repository and integration implications

### Repo mapping implications from “your GitHub research”

Because the GitHub research files (`github_repo_candidate_registry_v0.md`, `github_repo_shortlist_v0.md`, etc.) are not present in this session, I cannot map to *your* shortlisted repos or assess which of them are “near-term stack-worthy” vs “idea-source-only.” citeturn3search2turn5search16turn10search2turn3search25turn1search3  

### What is still worth using as “near-term stack repos” in principle

Even without your registry, the synthesis implies that the repos that are most “stack-worthy” (meaning: directly production-useful and aligning with replaceability) are:

- Provider SDKs that reduce integration time **but do not become your source of truth**:
  - LiteAPI publishes SDKs (e.g., Node SDK) describing the prebook→book flow and rates logic; these are viable as adapters inside your Provider Gateway. citeturn5search16turn7search0turn7search1  
- Database-to-API and admin framework repos that preserve the “database is truth” rule:
  - PostgREST docs plus repo (DB schema/permissions determine API). citeturn3search4turn3search25  
  - Directus repo (SQL database content managed via UI + REST/GraphQL API). citeturn3search2turn3search6  
- Analytics/export infrastructure that prevents vendor lock-in:
  - PostHog batch exports explicitly exist to schedule data exports to supported destinations, including Postgres and BigQuery. citeturn1search3turn1search15turn1search7  

If you later share your candidate registry/shortlist files, the most important filter to apply is: “Does this repo create durable state outside our control?” Repos that do should be treated as idea sources, not core stack. (This is the “no hidden business-critical state in vendor dashboards/workflow tools” rule made concrete.) citeturn8search6turn3search4  

## Implementation sequence and staged plan

This section answers both “minimum viable implementation sequence” and the 30/60/90 staged plan. The guiding dependency structure is:

1) You cannot run disciplined experiments without a portfolio ledger.  
2) You cannot monetise wedge experiments without a booking gateway + ledger.  
3) You cannot scale SEO experiments without a page registry and index-safety rails.  
4) You cannot make portfolio decisions without analytics that joins SEO → funnel → booking → economics.

### Minimum viable stack that still preserves explicit state, bounded autonomy, and observability

Minimum viable does **not** mean “fewest tools”; it means “fewest *truth systems*.”

Minimum viable truth systems:
- One internal database (Postgres) as durable truth for portfolio, publishing registry, and commerce ledger, with constraints and an audit trail approach. citeturn2search3turn2search2  
- One provider gateway service that encapsulates LiteAPI (and later Booking.com) and emits consistent events + writes ledger updates. citeturn7search0turn7search1turn0search6  
- One page factory (Next.js ISR) that reads the publishing registry and generates only approved indexable pages + sitemaps. citeturn1search0turn6search0  
- One analytics capture + export loop (PostHog + batch export) plus dashboards in Metabase. citeturn6search5turn1search15turn4search4  
- One observability strategy (OpenTelemetry) to correlate agent actions and gateway operations. citeturn4search7  

### Thirty days

Deliverables that create “first real wedge experiments” with explicit state and evidence:

- Implement the internal database schemas: portfolio, publishing, commerce, audit, analytics exports.
  - Use constraints/foreign keys to prevent inconsistent lifecycle states. citeturn2search3turn2search0  
  - Use JSON types for evolving fields (experiment configs, provider payload snapshots) without ejecting truth into docs. citeturn2search1  
  - Add audit-trigger patterns for critical tables (decisions, approvals, bookings). PostgreSQL documents trigger functions and provides an auditing example. citeturn2search2  

- Stand up Directus for human review and lightweight operations (portfolio + page registry + booking ledger access). citeturn3search6turn3search14  

- Build the Provider Gateway “thin vertical slice” with LiteAPI:
  - Search hotels by geo/place boundary. citeturn5search0turn5search4  
  - Fetch rates, then PREBOOK to revalidate and obtain `prebookId`. citeturn7search0turn7search7  
  - BOOK using `prebookId`, and store booking ID + client reference for dedup/tracking. citeturn7search1turn7search13  
  - Implement cancel endpoint integration and store cancellation outcomes. citeturn0search29turn0search9  
  - Schedule reconciliation pulls to correct drift. citeturn0search1turn7search19  

- Implement the Page Registry and one high-intent template using Next.js ISR:
  - Only publish pages with explicit `indexable` status.
  - Generate sitemap(s) from the Page Registry; respect sitemap limits (50,000 URLs / 50MB). citeturn6search0  

- Instrument the funnel and capture the event joins:
  - Install PostHog capture (autocapture + a small set of custom server events) and immediately configure Postgres batch export into a dedicated schema. citeturn6search5turn6search2turn1search15  

- Start your first wedge scorecard dashboard in Metabase (SEO → funnel → booking conversion → cancellation). citeturn4search4turn6search6  

### Sixty days

Deliverables that enable multiple experiments and “bounded promotion/pause/kill” decisions without meetings:

- Add an explicit Experiment Registry:
  - record page template versions and variant exposures,
  - record provider choice as an experimental factor,
  - link all results to the portfolio ledger.

- Import Search Console performance via API:
  - Pull `searchanalytics.query()` daily for page cohorts; base metrics on documented meaning of clicks/impressions/CTR/position. citeturn6search4turn6search1turn6search14  

- Add indexing safety:
  - Implement faceted navigation containment rules; Google explicitly calls out overcrawling and slower discovery crawls from faceted navigation URLs. citeturn1search2turn1search6  
  - Enforce `noindex` correctly (page must not be blocked by robots.txt) and use robots.txt for crawl management, not for de-indexing. citeturn5search3turn5search7  

- Introduce Booking.com Demand API as a thin-slice comparator (search + minimal order flow) so provider switching is not theoretical:
  - Use search examples (coordinates/radius + sort by distance) for proximity wedges. citeturn5search5  
  - Validate payments constraints (SCA token/PSP requirements) and operational implications. citeturn7search2turn7search6turn7search4  
  - Establish rate-limiting strategies. citeturn5search25  

- Add OpenTelemetry correlation IDs across:
  - page generation runs,
  - provider gateway calls,
  - agent actions. citeturn4search7turn4search3  

### Ninety days

Deliverables that support “multiple live wedges” and cleaner long-term replaceability:

- Formalise data modelling with dbt and add tests on the mart layer:
  - `unique`/`not_null` on IDs,  
  - `relationships` tests for joins between events and ledgers,  
  - `accepted_values` for enum-like fields (status, provider_id, wedge_stage). citeturn4search10turn4search6  

- Add row-level security and/or namespace separation (wedge_id/brand_id policies) as you approach multi-brand:
  - PostgreSQL row security policies are created with `CREATE POLICY` and enabled per table. citeturn3search3turn3search0  

- Implement automated “decision packets”:
  - weekly wedge report auto-generated with links to dashboards and key deltas,
  - anomaly queues (booking failures, reconciliation mismatches, index bloat),
  - pre-filled decision proposals in the portfolio ledger for human approval.

- Prepare the future separation path:
  - document how logical replication and/or logical decoding could be used to move wedge/brand schemas into separate databases without losing history. citeturn11search3turn11search4turn11search6  

## Major risks, tensions, and mitigations

### Tension between “speed to experiment” and “explicit durable state”

**Risk:** you move too fast and let operational truth slip into vendor dashboards (LiteAPI dashboard, analytics UI, CMS UI) and then autonomy becomes opaque and un-auditable.

**Mitigation:** enforce the “export/ledger first” rule:
- Every booking attempt and final booking lives in your commerce ledger; reconciliation jobs backstop drift. citeturn0search1turn7search1  
- Every analytics event is exported to your controlled store, not only visible inside PostHog’s UI. citeturn1search15turn1search3  

### Tension between programmatic SEO scale and Google policy risk

**Risk:** “page machine” behaviour becomes scaled content abuse or doorway-like location funnels; crawl traps explode indexed URL count.

Google defines scaled content abuse as generating many pages primarily to manipulate rankings rather than help users. citeturn0search3  
Google also highlights faceted navigation as a major source of overcrawling and slower discovery crawls. citeturn1search2turn1search6  

**Mitigation:** implement an explicit Page Registry with index intent + pruning workflow, and keep interactive filters non-indexable by default. citeturn5search3turn1search2  

### Tension between booking conversion and payment/compliance complexity

**Risk:** payment model choices create lock-in (SDK-based payments, specific payment method semantics), and UK/EEA SCA requirements increase operational burden.

Booking.com documents that SCA compliance is required for EEA and UK online payments and that a PSP token must be shared during order creation for certain methods. citeturn7search2turn7search4  
LiteAPI’s payment SDK approach uses `usePaymentSdk=true` in prebook and returns a `secretKey`/`transactionId` for SDK processing, which is fast but a coupling point. citeturn7search11turn7search0  

**Mitigation:** define a payment strategy seam in your Provider Gateway and store the chosen payment strategy per wedge/brand with approval gates.

### Tension between workflow automation and durable state

**Risk:** automation engines and workflow histories become de facto truth because they are “where the run happened.”

Temporal explicitly limits workflow execution event history (warnings at 10,240 events; limit 51,200 events) and recommends Continue-As-New to avoid failures, which underscores that workflow history is a bounded execution trace, not a durable portfolio database. citeturn8search6turn8search2  

**Mitigation:** require all workflows/agents to write proposals/outcomes into the internal ledgers; treat orchestrators as execution layers only.

## Clear final classification

### Likely now

- entity["organization","PostgreSQL","relational database"] as the unified durable system of record (portfolio + publishing registry + commerce ledger + audit trail). citeturn2search3turn2search1turn2search2  
- entity["company","Directus","open-source data platform"] for human review/admin workflows on top of your DB. citeturn3search6turn3search14  
- entity["organization","PostgREST","postgres-to-rest server"] (or equivalent) to keep the DB as the policy boundary for agent/workflow access. citeturn3search4turn3search13  
- entity["company","LiteAPI","travel api provider"] integrated behind your Provider Gateway (search → rates → prebook → book → cancel → reconcile). citeturn5search0turn7search0turn7search1turn0search29turn0search1  
- Next.js ISR-driven Page Factory backed by a Page Registry; governed sitemaps. citeturn1search0turn6search0  
- SEO policy rails (scaled content abuse avoidance, faceted navigation containment, correct noindex/robots usage, safe testing). citeturn0search3turn1search2turn5search3turn1search30turn5search7  
- entity["company","PostHog","product analytics platform"] capture + batch export to controlled DB schema; entity["company","Metabase","business intelligence tool"] for decision dashboards. citeturn6search5turn1search15turn4search4  
- entity["organization","OpenTelemetry","observability framework"] correlation across services and workflows. citeturn4search7turn4search3  

### Likely later

- entity["company","Booking.com","online travel company"] Demand API as a deeper secondary integration (orders/create/modify/cancel) once LiteAPI-backed wedge signals justify expanding booking rails and/or switching leverage. citeturn0search38turn7search14turn5search5turn7search2  
- dbt modelling + tests at scale; stronger schema governance. citeturn4search10turn8search12  
- Multi-brand separation using PostgreSQL row security now, and later logical replication/logical decoding to split databases cleanly. citeturn3search0turn11search3turn11search4  
- Formal tracking plan enforcement layers for large teams/large agent ecosystems (e.g., Segment Protocols). citeturn8search21turn8search9  

### Likely custom-build

- Provider Gateway contract + internal booking ledger + idempotent booking attempt logic (the “bounded autonomy commerce core”). citeturn7search13turn8search3  
- Portfolio decision model + approvals + decision packets integrating evidence from dashboards and provider reconciliation. citeturn0search1turn6search4  
- Page Registry and the publication gating/pruning system to avoid scaled/doorway failure modes. citeturn0search3turn1search2  

### Likely avoid

- Docs-as-state or spreadsheet-as-state becoming the durable portfolio system. Notion databases are “collections of pages,” and the Notion API has a documented average rate limit of 3 requests/sec per integration—both of which make it easy to drift into convention-based hidden state under automation load. citeturn9search0turn9search1  
- Airtable-style tools as the primary system of record for high-frequency autonomous operations; Airtable enforces 5 req/sec per base and revision history retention depends on plan, which can be mismatched with an autonomy-heavy “eventy” system. citeturn10search0turn9search2  
- Treating workflow history as portfolio truth; Temporal’s event history limits illustrate why execution history is not a durable database for business state. citeturn8search6turn8search10  
- Programmatic SEO that resembles scaled content abuse or uncontrolled faceted navigation index bloat. citeturn0search3turn1search2