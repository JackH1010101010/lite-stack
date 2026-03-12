# SEO experimentation and programmatic page generation for an autonomy-heavy travel wedge venture

## Executive recommendation

The Project/session does not currently contain the documents you listed (including `operating-doctrine-v1.md`, `stack-thesis-and-technology-evaluation-framework-v1.md`, `deep-research-report-4.md`, and `deep-research-report-5.md`). I therefore cannot treat them as source-of-truth inputs and will base this report on your stated operating requirements plus current primary technical/search documentation.

The strongest “third major stack gap” closure for your current stage is a **portfolio-governed “Page Factory”**: a system that (a) generates a *small number of highly differentiated, high-intent landing pages* from structured state and curated logic, (b) runs bounded experiments without creating hidden state in a CMS or vendor dashboard, and (c) continuously prunes/refreshes pages through explicit lifecycle management.

The most practical near-term architecture is:

- A **framework-first publishing system** (server-rendered + incremental rebuilds) for reliable indexing and fast iteration, using patterns like incremental static regeneration to avoid full rebuilds as page volume grows. citeturn7view0turn7view3  
- An internal **Page Registry** (your system of record) that defines which pages exist, what template/version they use, their lifecycle state (draft → proposed → indexable → retired), and what experiments are running on them. This prevents “chat history / agent memory / CMS UI” from becoming the durable source of truth.
- An explicit **anti-spam quality gate** aligned with entity["company","Google","search company"] Search policies: scaled low-value page generation, doorway-style location funnels, and thin affiliate pages are high-risk failure modes for programmatic travel SEO. citeturn3view0turn3view2turn10view0  
- Experimentation that cleanly separates **SEO stability** (indexable pages and crawl signals) from **conversion tests** (blocks, CTAs, funnel tweaks), using documented best practices for website testing to avoid cloaking and indexing confusion. citeturn3view3turn3view5  

## Best early-stage SEO and programmatic page architecture

### Architecture goals mapped to your operating model

You want increasing autonomy without opaque state, and you want bounded experimentation with durable audit trails. For programmatic SEO, that implies:

- **Explicit durable state** for pages/templates/experiments (what exists, why, who approved it) rather than implicit state in a CMS, spreadsheet, or agent context.  
- **Controlled page volume**: the system should not “spray and pray” pages, because Google explicitly classifies mass-generated low-value pages aimed at rankings as “scaled content abuse.” citeturn3view0  
- **A hard line between “indexable landing pages” and “faceted/filter/search pages.”** Filter URLs can create effectively infinite URL spaces; Google documents overcrawling and slowed discovery caused by parameterised faceted navigation. citeturn4search7  

### Core pattern: a portfolio-governed Page Factory

Early-stage, the simplest reliable pattern is:

**Portfolio state → Page registry → Deterministic generation → Publish → Measure → Prune/refresh**, with approvals at the “create page type / create page set / change indexing rules” gates.

Concretely:

1) **Page Registry (system of record)**
- A database table (or a small set of tables) that stores, for every page: canonical URL, wedge association, location/cluster association, template ID + version, “indexing intent” (index/noindex/blocked/redirected), created-by (human/agent), approval status, and evidence links.
- This is where autonomy is bounded: agents can propose pages (insert as `proposed`) but cannot move pages to `indexable` without an approval step.

2) **Template library as versioned artefacts**
- Store templates as code (so they are reviewable and diffable), and store “content blocks”/copy fragments in a structured store (headless CMS or structured tables) that is exportable and not “business-critical state hidden in a UI.”

3) **Rendering strategy: static-first with incremental regeneration**
- Prefer server-rendered HTML (SSR or static pre-render) for crawlability and consistent indexing. Google’s dynamic rendering documentation describes dynamic rendering as “a workaround and not a recommended solution,” and notes additional complexity/resource requirements. citeturn2view2  
- Use incremental regeneration for scale: Next.js ISR explicitly supports “large amounts of content pages without long build times” and updates pages without rebuilding the whole site. citeturn7view0  
- Use on-demand rebuild triggers (webhooks) for urgent refreshes (e.g., a page’s editorial promise changed, a compliance disclaimer updated, or a page was promoted/retired).

4) **Two-tier content model: stable base + dynamic intent module**
High-intent accommodation pages should not be “price list pages” that go stale. A robust travel pattern is:
- The **indexable page body**: stable, helpful, differentiated content (what the wedge promises; how it works; what “luxury” means in your context; how proximity is defined; what cancellation expectations look like).
- A **dynamic availability module**: user selects dates and travellers; your booking layer performs real-time availability and price checks. This keeps the indexable page honest while still enabling conversion.

This aligns with Google’s people-first guidance: avoid producing pages primarily for search visits, or producing lots of content across topics “in hopes that some of it might perform well.” citeturn2view1  

### What “high-intent wedge pages” should look like (not a portal)

To avoid doorway/thin affiliate patterns, each programmatic page should have:
- A **clear promise and scope** (e.g., “last-minute luxury near X”, “urgent stays within 2 miles of Y”, “premium stays for late arrivals near Z”), not generic “Hotels in CITY” pages.
- **True differentiation** beyond swapped place names (unique shortlists, rules, maps, transport proximity logic, “why these hotels” rationale, or a distinct interaction model).
- Evidence-backed claims only; avoid “misleading functionality” patterns where a page implies services that are not reliably deliverable. citeturn10view2  

## Best later-stage evolution path

### Expand volume through controlled, demand-driven page sets

Later-stage, you can scale programmatic SEO safely by shifting from “generate many pages” to “generate the right pages”:

- Maintain an explicit list of **indexable landing page types** (templates) and **indexable page sets** (e.g., all neighbourhoods in London that meet specific supply thresholds), while keeping filter/search URLs non-indexable to prevent crawl traps. Google describes how parameter-based faceting can generate infinite URL spaces, leading to overcrawling and slower discovery of useful URLs. citeturn4search7  

### Add stronger automation with a publish gate (not full auto-publish)

When autonomy increases, add a policy layer:
- **Auto-draft**, **human approve**, **auto-publish** only when the page passes objective checks (content quality, uniqueness thresholds, structured-data validity, internal linking completeness, load performance, and a “does this meet the wedge promise?” checklist).

This also reduces calendar dependence: approvals become asynchronous queue work tied to explicit artefacts (page diffs and evidence), not meetings.

### Mature the SEO measurement and observability stack

Later-stage measurement should increasingly run via APIs so the system can self-monitor:

- Use Search Console performance data programmatically; Google documents querying Search Analytics via `searchanalytics.query()` to get the data exposed in the Performance report. citeturn9search8turn9search9  
- Use Search Console URL Inspection API to understand indexed status (not as a bulk indexing hack). The API returns index status for the version in Google’s index; it “cannot test the indexability of a live URL” in that endpoint. citeturn9search2  
- Treat sitemap submission and clean internal linking as the scalable discovery mechanisms. (Search Console API can also manage sitemaps; the API reference notes access to Search Analytics, Sitemaps, Sites, and URL Inspection services.) citeturn9search33  

### Prepare for multi-wedge and multi-brand separation

Later-stage, separation is mostly a routing/state discipline problem:
- Namespacing: `/wedge-name/…` or separate subdomains/domains per brand.  
- Independent Page Registries per wedge/brand (or a single registry with strict wedge/brand keys and permissions).
- Explicit rules to prevent “policy circumvention” behaviours (creating new subdirectories/sites to continue violating policies is explicitly called out). citeturn2view0  

## Candidate approaches compared

### Conventional CMS-first approaches

A traditional CMS (especially plug-in heavy) can be fast for a human content team, but it tends to create the failure mode you explicitly dislike: critical publishing state living in a vendor dashboard and ad-hoc conventions.

You can still use a CMS, but treat it as a **content component store**, not the system of record for page existence, page lifecycle, or experiments.

### Markdown and git-based publishing

Markdown + Git is excellent for auditability and deterministic builds, but can be too high-friction for frequent editorial iteration unless your team is very technical. It can still be a good choice for:
- template documentation,
- wedge playbooks,
- policy checklists,
- and ADR-like publishing decisions.

### Headless CMS + framework-first publishing

This is usually the best compromise for your requirements:

- Framework-first publishing keeps rendering/indexing controllable and testable.
- A headless CMS provides editorial workflows without owning the whole system.

Two strong headless-CMS shapes:

- **Open-source CMS you can self-host** (e.g., entity["company","Strapi","headless cms vendor"]): documentation describes Draft & Publish and APIs (REST/GraphQL) for content delivery. citeturn6search13turn6search11turn6search3  
- **SaaS structured-content CMS** (e.g., entity["company","Sanity","headless cms vendor"]): marketing and platform docs emphasise structured content and real-time collaboration, but the tradeoff is vendor coupling (mitigated via export capabilities and keeping the Page Registry in your database). citeturn6search28turn6search2  

### Database-driven page generation

A database-driven generator is a strong fit for autonomy + explicit state:
- The database tracks “what pages are allowed to exist,” status, and evidence.
- The renderer consumes that registry deterministically.
- Publishing becomes pipeline-driven rather than “someone clicked publish in a UI.”

This approach also pairs naturally with a portfolio management database if you’re already moving that way.

### Custom internal publishing pipeline

A fully custom internal pipeline becomes worthwhile later if:
- you need strict governance and safety checks,
- your wedges require complex templating logic (maps, proximity heuristics, premium filters),
- and you want deterministic page generation with rich observability.

Early-stage, the risk is overbuilding; the key is to build a small “Page Factory core” and reuse common frameworks for rendering and caching.

## Recommended tools, systems, and patterns

### Recommended rendering and page delivery stack

A high-fit “now” stack for programmatic high-intent landing pages is:

- **Next.js** as the publishing runtime, using static-first generation with ISR and on-demand regeneration for scale and freshness. ISR supports updating content without rebuilding the entire site and handling large amounts of content pages; the caching guide details multiple cache layers and revalidation controls. citeturn7view0turn7view1  
- Deploy on entity["company","Vercel","hosting platform"] if you want minimal ops and managed ISR caching; their docs describe ISR as stale-while-revalidate with cache persistence and managed headers. citeturn7view3  

A viable alternative for a more static-leaning site is **Astro**, which supports pre-rendered pages with optional on-demand/server rendering; this can reduce client-side JS and improve content-site performance characteristics, but experimentation ergonomics may be better in a Next.js ecosystem. citeturn5search2turn5search33  

### Recommended programmatic SEO site structure pattern

For travel wedges, the most robust page taxonomy is usually:

- **Indexable landing pages**: a limited set of wedge-location pages that are intentionally created, internally linked, and in sitemaps.
- **Non-indexable faceted/search pages**: the interactive browsing UI with filters and pagination, where URL parameters are controlled to avoid infinite crawl spaces.

Google explicitly recommends controlling faceted navigation, including “prevent crawling of these URLs” when you don’t need them indexed, because parameterised faceting can lead to overcrawling and slower discovery crawls. citeturn4search7  

### Recommended experimentation tooling shape

Split your experimentation tooling by purpose:

- **Conversion and funnel experiments** (CTA copy, module order, default filters, “show map first,” etc.): use feature flags and experimentation tooling that can be driven by your own experiment registry and logged in your own system.  
  - entity["company","PostHog","product analytics vendor"] documents feature flags with “A/B testing integration” and experiments run via flags. citeturn6search1turn6search19  
  - entity["company","GrowthBook","feature flagging vendor"] positions itself as open-source feature flags and A/B testing, and its docs describe running experiments using feature flags, including server-side testing patterns. citeturn6search4turn6search22  

- **SEO-impact experiments** (template-level changes that could affect indexing/ranking): follow Google’s website testing guidance to minimise search disruption and avoid cloaking.
  - Use `rel="canonical"` on alternate URLs when variants are near-duplicates and you do *not* want them indexed separately; Google recommends canonical rather than noindex in multi-URL tests because it matches intent and avoids unexpected effects. citeturn3view3  
  - Use `302` (temporary) redirects rather than `301` for test redirects; and don’t run tests longer than necessary, because long-running experiments can be interpreted as deceptive. citeturn3view5  

### Recommended indexing, structured data, and discovery patterns

- **Sitemaps:** Google documents sitemap limits (50,000 URLs or 50MB uncompressed) and recommends splitting large sitemaps and using a sitemap index file. citeturn1search7turn1search3  
- **Canonicalisation:** Google explains canonicalisation as selecting the representative URL among duplicates, and provides methods to specify your preference (including `rel="canonical"`). citeturn4search1turn4search5  
- **Noindex for pruning / controlling indexation:** Google’s `noindex` guidance notes the page must *not* be blocked by robots.txt, because otherwise crawlers can’t see the directive and the page may still appear in results if referenced externally. citeturn4search6  
- **Structured data:** follow Google’s general structured data guidelines; they explicitly state structured data should not violate spam policies, and correct markup does not guarantee rich results. citeturn8search0  
  - Breadcrumb markup is a pragmatic, low-risk enhancement; Google documents breadcrumb structured data usage in search results. citeturn8search1  
  - WebSite/Organization structured data can help with site name and entity clarity; Google documents both. citeturn8search2turn8search5  

## Build vs buy analysis

### What you should almost certainly buy/reuse now

- **Publishing runtime and caching primitives:** use a mainstream framework/runtime (Next.js + ISR) rather than building a custom renderer/cache. citeturn7view0turn7view1  
- **Basic editorial UI (optional):** a headless CMS for editing block content is worth buying/reusing if you have non-technical editing needs; entity["company","Strapi","headless cms vendor"] is open-source and provides REST/GraphQL APIs, helping avoid “vendor dashboard lock-in.” citeturn6search7turn6search11turn6search3  
- **Experiment execution tooling:** feature-flag driven experimentation platforms can be reused, but you should still keep experiment definitions and approvals in your own registry. citeturn6search1turn6search22  

### What you should custom-build now

- **The Page Registry and lifecycle model** (your durable source of truth for pages/templates/variants/approvals). This is the core of “bounded autonomy” for publishing.
- **A deterministic generation pipeline** that turns approved registry entries into deployed routes and sitemaps, with run logs and diffs (auditability).
- **Wedge-specific editorial logic** that creates differentiation: e.g., how you define “luxury,” how you rank “urgent stay” options near a POI, what constraints govern proximity.

### What you should delay until later (avoid early overbuilding)

- A general-purpose internal CMS replacement.
- A multi-brand, multi-site publishing platform with complex tenancy and routing unless/until you have multiple wedges producing meaningful organic revenue.
- Large-scale automated content generation across many topics without strong differentiation and review gates; Google explicitly warns against producing lots of content on many topics “in hopes that some of it might perform well,” and flags extensive automation as a warning sign when content is search-engine-first. citeturn2view1  

## Content-quality and anti-spam safeguards

### The specific spam risks for programmatic travel SEO

Travel programmatic SEO is exposed to several explicit Google spam policy categories if done poorly:

- **Scaled content abuse:** “many pages generated for the primary purpose of manipulating search rankings and not helping users,” including large-scale AI generation without added value. citeturn3view0  
- **Doorway abuse:** creating many location-targeted pages that funnel users to one page or generating substantially similar pages that sit closer to search results than a clear browseable hierarchy. citeturn3view2  
- **Thin affiliation (thin affiliate):** publishing pages with affiliate links where descriptions are copied from merchants without original value; Google notes good affiliate sites add value via original reviews, comparisons, testing, and useful navigation. citeturn10view0  

Additionally, keyword stuffing examples in spam policies explicitly call out blocks listing cities/regions for ranking manipulation—highly relevant to templated location pages. citeturn10view1  

### Safeguards that fit “bounded autonomy” and low calendar dependence

A practical safeguard set (implementable now) is to require each indexable page to pass a **Quality Gate** before promotion:

1) **Differentiation requirements**
- Each page must include wedge-specific value that materially differs by location (not just substituted names).
- Require at least N “unique data facts” per page (e.g., proximity logic, curated shortlist criteria, travel constraints, seasonality notes).

2) **Promise integrity**
- If you claim “available tonight,” ensure the page shows availability from the booking integration at click-time and avoids misleading static claims. Google’s “misleading functionality” policy covers sites that trick users into thinking they can access a service they can’t. citeturn10view2  

3) **Indexing discipline**
- Maintain explicit “index intent” per route group:
  - indexable landing pages in sitemaps + internal linking,
  - non-indexable search/filter pages (noindex or crawl-blocked depending on strategy),
  - and strict canonicalisation to avoid duplication. citeturn4search6turn4search1turn4search7  

4) **Faceted navigation containment**
- Follow Google’s guidance: either prevent crawling of faceted URLs when you don’t need them indexed, or implement best practices if you do. citeturn4search7  

5) **Structured data validation**
- Structured data must reflect visible content and comply with general guidelines; Google notes structured data issues can cause manual actions for rich results eligibility. citeturn8search0  

6) **Page pruning as a first-class workflow**
- Pages that fail to earn impressions/conversions should be retired or consolidated.
- Use `noindex` correctly (page must be crawlable), or remove pages with 404/410 depending on intent; Google’s removals guidance references returning 404 or 410 for permanent removal. citeturn4search6turn4search4  

## Experimentation design recommendation

### Separate SEO experiments from conversion experiments

For your venture, “SEO experimentation” has two distinct layers that should not be conflated:

1) **SEO layer:** page types, information architecture, internal linking, indexation rules, template-level content decisions that affect what ranks.
2) **Conversion layer:** UX, copy, offers presentation, funnel steps, and booking CTA behaviour.

If you mix these, you risk creating variability that looks like cloaking or causes unpredictable indexing.

### Safe patterns for conversion experiments

Use feature flags/experiments for blocks and UI changes while keeping the core page meaning stable.

- PostHog documents experiments run via feature flags with statistical tracking; feature flags support multivariate rollouts. citeturn6search1turn6search9  
- GrowthBook documents experiments and describes server-side testing via feature flags and targeted rules. citeturn6search22turn6search4  

Operationally, you should store (in your own Page Registry / experiment tables):
- hypothesis,
- target pages,
- variants (block config),
- start/end,
- primary metrics,
- approval record,
- and results/evidence links.

The experiment tool should execute assignments and collect events, but your system should remain the durable authority for “what experiment existed and why.”

### Safe patterns for SEO-impact website tests

If you do multi-URL SEO tests (less common early), follow Google’s documented best practices:

- Don’t cloak test pages (don’t show Googlebot something different from humans by user agent logic). citeturn3view3  
- For multi-URL tests where alternate URLs are near-duplicates, use `rel="canonical"` on alternates and point to the original; Google recommends canonical rather than noindex here and warns noindex can have unexpected effects. citeturn3view3  
- Use 302 (temporary) redirects for test redirects, not 301. citeturn3view5  
- Run experiments only as long as necessary; long-running experiments can be interpreted as attempts to deceive. citeturn3view5  

In practice for early-stage wedge SEO, the higher-leverage move is usually **template A vs template B as different page types targeting different intents**, measured via Search Console over time, rather than trying to SEO-split-test the same query set.

## Source-of-truth design for pages, templates, and experiments

### Source-of-truth boundaries

To meet your requirements (“no hidden business-critical state in a vendor dashboard”), design explicit ownership:

- **Your database (Page Registry) owns:** what pages exist, their canonical URLs, lifecycle state, index intent, wedge associations, approvals, and audit logs.
- **Your code repository owns:** templates as code, schema/contract definitions, rendering rules, and crawling/indexation directives.
- **Your CMS (if used) owns:** reusable editorial content blocks (copy snippets, FAQs, curated lists), but not “page existence truth.” If a CMS is down or you migrate, you should still know exactly which pages exist and what state they’re in.
- **Your analytics/experimentation tool owns:** event collection and variant assignment mechanics, but not experiment governance truth.

### Minimal object model you likely need early

A minimal set of durable objects (conceptually) that supports autonomy:

- `PageTemplate` (versioned)
- `Page` (canonical URL + wedge + location cluster + template version + state)
- `PageVariant` (block configuration; used for conversion experiments)
- `Experiment` (hypothesis, variants, allocations, start/end, approval status)
- `PublicationRun` (what changed, pages regenerated, sitemap changes)
- `EvidenceLink` (Search Console snapshots, revenue metrics, booking conversion)

### Connecting to Search Console and explicit evidence

For durable SEO evidence:

- Query `searchanalytics.query()` daily and store snapshots so you can evaluate page cohorts and template cohorts over time. citeturn9search8turn9search0  
- Use URL Inspection API for debugging indexing status at a URL level; note the endpoint returns index status of the indexed version and doesn’t test live indexability in that method. citeturn9search2  
- Respect API usage limits; Google publishes usage limits for the Search Console API. citeturn9search3  

## Risks, lock-in, and maintenance concerns

### Primary operational risks

- **Index bloat and crawl traps:** parameterised faceted navigation can create infinite URL spaces; Google documents the harms (overcrawling and slower discovery crawls). citeturn4search7  
- **Scaled-content penalties:** programmatic page generation that lacks real value can match “scaled content abuse.” citeturn3view0  
- **Doorway page penalties:** overly similar location pages that funnel to the same destination, or sit “closer to search results” than a browseable hierarchy, can be doorway abuse. citeturn3view2  
- **Thin affiliate risk:** if your pages resemble cookie-cutter affiliate pages with copied descriptions and little added value, you’re in a documented spam category. citeturn10view0  

### Lock-in risks (and how to reduce them)

- **CMS lock-in:** mitigate by keeping the Page Registry and lifecycle outside the CMS; store content block IDs but keep export/snapshots.
- **Framework/hosting lock-in:** mitigate by keeping rendering logic portable and keeping content/state in your database; ISR behaviour differs by platform, but Next.js documents ISR’s general properties while Vercel documents their managed cache behaviour. citeturn7view0turn7view3  
- **Experiment tooling lock-in:** mitigate by storing experiment definitions and results in your own registry and using tools primarily for assignment + event ingestion. citeturn6search1turn6search22  

### Maintenance concerns you should plan for explicitly

- Canonical/noindex mistakes can create long-lived indexing confusion (Google canonicalisation is a selection process; your hints may not always be chosen). citeturn4search1turn4search5  
- Misusing robots.txt to block pages you also want noindexed can backfire; Google notes noindex requires crawl access and robots.txt blocking can prevent crawlers from seeing the directive. citeturn4search6turn4search7  
- Structured data drift across templates can cause manual actions for rich results eligibility; follow general guidelines and validate. citeturn8search0  

## Suggested minimal implementation path for this venture

### Establish the Page Factory core

1) **Create your Page Registry schema**
- Implement `Page`, `PageTemplate`, `Experiment`, and `PublicationRun` tables (or equivalent).
- Add lifecycle states: `draft`, `proposed`, `approved`, `indexable`, `noindex`, `redirected`, `retired`.
- Require approvals for: (a) new template types, (b) new indexable page sets, (c) changes to robots/canonical policy.

2) **Implement two wedge-specific templates and a small controlled page set**
Start with low volume and high differentiation:
- A “Proximity urgent stay” template (near a POI/transport node).
- A “Last-minute luxury” template (neighbourhood + premium criteria).
Generate ~20–100 pages max at first, based on supply and search intent.

3) **Rendering strategy**
- Use Next.js static-first pages with ISR, so you can handle growth without massive builds; ISR supports revalidation intervals and (depending on router mode) on-demand regeneration. citeturn7view0turn7view1  

4) **Indexing discipline**
- Generate a sitemap that includes only `indexable` pages; follow Google limits and sitemap index patterns as you grow. citeturn1search7turn1search3  
- Implement canonical tags and a strict `noindex` policy for pages that should not rank; ensure noindex pages are crawlable (not robots-blocked). citeturn4search6turn4search5  
- Implement a hard policy for faceted URLs (don’t index infinite filter combinations); follow Google’s faceted navigation guidance. citeturn4search7  

5) **Measurement loop**
- Store daily Search Console performance snapshots via API and join them to your Page Registry and template versions. citeturn9search8turn9search0  
- Use URL Inspection API selectively for debugging indexing issues. citeturn9search2  

6) **Conversion experiments**
- Add one experimentation tool (GrowthBook or PostHog) for conversion-level experiments; keep experiment governance in your registry. citeturn6search22turn6search1  

7) **Pruning workflow**
- After 30–60 days, automatically flag pages with negligible impressions and no conversions for review.
- Consolidate or retire; use correct noindex/removal mechanics per Google guidance. citeturn4search6turn4search4  

## Clear final classification

### Likely now

- A database-backed **Page Registry** with explicit lifecycle states, approvals, and evidence links.
- A framework-first publishing system with server-rendered HTML and incremental regeneration (Next.js ISR) for scalable page volume without full rebuilds. citeturn7view0turn7view1  
- A strict policy separating **indexable landing pages** from **faceted/filter/search URLs**, aligned with Google’s faceted navigation guidance to avoid infinite URL spaces. citeturn4search7  
- A measurement loop driven by Search Console API snapshots linked to template versions and page cohorts. citeturn9search8turn9search0  
- Conversion experiments via feature flags, with experiment governance stored in your own system. citeturn6search1turn6search22  

### Likely later

- Scale-up of page volume through demand-driven page sets + automated refresh/pruning.
- Stronger on-demand regeneration orchestration and deeper observability over publication runs.
- Multi-brand separations (routing + independent registries) once you have more than one proven wedge.

### Likely custom-build

- The Page Registry and publish gate logic (your core bounded-autonomy mechanism).
- Wedge-specific editorial logic and ranking/selection heuristics (your differentiation moat).
- The “quality gate” scoring system and pruning policies that prevent scaled-content and doorway patterns.

### Likely avoid

- “Content machine” generation of large volumes of weakly differentiated pages; Google explicitly defines scaled content abuse as mass generation primarily to manipulate rankings. citeturn3view0  
- Location-page funnels that resemble doorway abuse (many near-duplicate city pages that funnel to a single destination, or substantially similar pages that sit closer to search results than a browseable hierarchy). citeturn3view2  
- Thin affiliate patterns where pages mostly replicate merchant descriptions without original value. citeturn10view0  
- Relying on dynamic rendering as an SEO workaround; Google states it is not a recommended solution and adds complexity. citeturn2view2