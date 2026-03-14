# Conversion Sprint — Progress Log

## Run 1 — 2026-03-13
**Track:** 1 (Competitor UX Teardowns)
**Task:** Researched 4 luxury hotel booking competitors: Secret Escapes, Mr & Mrs Smith, Luxury Escapes, SLH
**Output:** `competitor-ux-teardown.md`
**Key findings:**
- Lite-Stack has multiple conversion elements already built but hidden via CSS (`display:none`): anchor pricing, savings badges, trust strip, CUG banner, star ratings, hotel descriptions
- Every competitor uses anchor pricing (was/now) — this is the #1 quick win
- SLH's price comparison tool drove +33% conversion — Lite-Stack's member vs public pricing could replicate this
- Secret Escapes' mandatory signup gate doubled mobile signups — validates Lite-Stack's members-only approach
- Urgency/scarcity signals (countdown timers, "X rooms left") are universal among competitors but absent from Lite-Stack

**Next run:** Continue Track 1 with deeper competitor analysis (signup funnels, mobile UX, checkout flows), or move to Track 2 (Copy & Messaging Audit) if Track 1 coverage is sufficient.

---

## Run 2 — 2026-03-13
**Track:** 1 (Competitor UX Teardowns — continued)
**Task:** Deep-dive into signup funnels, mobile UX patterns, and checkout flow analysis
**Output:** Appended to `competitor-ux-teardown.md`
**Key findings:**
- Secret Escapes' mandatory signup gate doubled mobile signups — backed by Optimizely A/B testing proving higher LTV:CAC ratio
- Mobile wallets (Apple Pay/Google Pay) drive 26-30% conversion increases; Selfbook reports 45% of mobile hotel bookings use Apple Pay
- Hotel checkout abandonment averages 80%; 52% of travelers cite bad digital experience (SiteMinder 2025)
- Lite-Stack's 3-step checkout is lean but has 7 specific friction points: no price reinforcement, no urgency timer, no pre-fill for members, no express payment, weak error copy, no exit-intent recovery, and generic loading states
- Cart-abandonment email drips convert at ~10% vs 1% for standard campaigns — Ambiente Sedona drove $264K from drip alone
- Top 3 quick wins identified: (1) auto-fill guest details for signed-in members, (2) add Apple Pay via Stripe Payment Request API, (3) add exit-intent "save this rate" modal

**Next run:** Run 3 — complete Track 1 with pricing psychology, promotional mechanics, and loyalty retention analysis. Then Track 2 begins at Run 4.

---

## Run 3 — 2026-03-13
**Track:** 1 (Competitor UX Teardowns — final)
**Task:** Pricing psychology, promotional/flash sale mechanics, and loyalty/retention program analysis
**Output:** Appended to `competitor-ux-teardown.md`
**Key findings:**
- Anchor pricing (was/now) is the universal #1 conversion tactic — Lite-Stack already has it built but hidden in CSS; enabling it is a zero-effort P0 win
- Secret Escapes' 72-hour flash sale model with best-price guarantee (£25 credit if beaten) is the gold standard for members-only deal platforms
- Charm pricing (£X99 endings) produces measurable conversion lifts across all competitors
- Scarcity cues ("Only X rooms left") backed by 2025 *Journal of Travel Research* study showing they counteract consumer delay behavior
- SLH Club requires only 4 nights for mid-tier status (vs Marriott's 25) — low thresholds maximize tier progression and repeat bookings
- IHG data: loyalty members spend 20% more, are 10x more likely to book direct, and drive 60%+ of room nights
- Secret Escapes' Amazon gift card rewards (£35-£100 at spend thresholds) effectively provide 8-14% cashback — tangible, non-travel-dependent rewards
- Luxury Escapes Société uses "double-dip" rewards (earn airline miles + platform points simultaneously)
- Lite-Stack's `{{REFERRAL_JS}}` hook already exists — activating a £25/£25 referral program is a quick win
- Consolidated top 10 priority-ranked conversion wins for Lite-Stack with estimated impact percentages

**Track 1 COMPLETE.** Deliverable: `competitor-ux-teardown.md` (now comprehensive across 3 runs covering homepage UX, signup funnels, mobile patterns, checkout flows, pricing psychology, promotional mechanics, and loyalty retention)

**Next run:** Run 4 — Track 2 (Copy & Messaging Audit) begins. Will read all 3 site configs and the template, audit all user-facing copy, and write improved variants.

---

## Run 4 — 2026-03-13
**Track:** 2 (Copy & Messaging Audit — Part 1)
**Task:** Full copy inventory and audit across template.html + all 3 site configs. Identified and ranked the 10 weakest copy elements with improved variants.
**Output:** `copy-audit-improvements.md`
**Key findings:**
- **"View details" is the weakest CTA on the site** — appears on every hotel card for logged-in members but is informational, not action-oriented. Recommended: "Book from £X/night →" (est. +8-15% card click-through)
- **Nav "Sign in" button conflates sign-in with sign-up** — confusing for first-time visitors. Recommended: "See member rates" (est. +3-5% nav CTA clicks)
- **Modal headline leads with action, not benefit** — "Join LuxStay — it's free" should be "Save 10-30% on 5-star hotels" (est. +5-10% modal completion)
- **Post-signup "Refresh prices" instruction is a UX failure** — LuxStay and Maldives tell users to manually refresh. P0 code fix: auto-call `doSearch()` on signup success
- **LuxStay missing hero eyebrow** — Dubai Ultra and Maldives both have eyebrows with savings percentages. LuxStay's is empty, wasting prime real estate
- **CUG banner uses negative framing** — "Member prices hidden" feels adversarial. Recommended: "Members see rates 10–30% below Booking.com. Join free to see yours."
- **"No availability" is a dead end** — no recovery path, no date suggestions. Every OTA offers alternatives
- **"Done" button post-booking wastes peak engagement moment** — should redirect to more browsing or referral prompt
- **Dubai Ultra and Maldives use "Live rates from hotel API" in trust items** — too technical for consumers. LuxStay correctly uses "Live rates, updated hourly"
- 10 prioritized fixes with effort estimates and expected conversion impact documented

**Next run:** Run 5 — Track 2 continues with deeper analysis of FAQ copy quality, editorial section improvements, meta description / OG tag optimization, and error message microcopy refinements.

---

## Run 5 — 2026-03-13
**Track:** 2 (Copy & Messaging Audit — final)
**Task:** Deep audit of FAQ copy (all 3 sites), editorial sections, error message microcopy, meta description/OG tag optimization, and schema descriptions
**Output:** Appended to `copy-audit-improvements.md`
**Key findings:**
- **All 3 sites are missing critical FAQ items**: no cancellation policy FAQ, no payment security FAQ, no legitimacy/"how do you get these prices?" FAQ. These are the top 3 booking objections — addressing them increased conversion by 35% in the sunshine.co.uk case study (Conversion Rate Experts)
- **Error messages expose raw API errors to users**: `${e.message}` is injected directly into user-facing HTML, potentially showing "Status 500" or "ECONNRESET". Rewrote all 8 error messages with human-friendly copy and fallback paths
- **No OG images set for any site**: `OG_IMAGE` placeholder exists in the template but no URLs are configured. Social shares show generic browser screenshots — a major CTR killer
- **Meta descriptions are under-optimized**: all 3 are under 155 chars and miss the opportunity for a CTA or competitor comparison. Rewrote all 3 with front-loaded benefits, Booking.com comparison, and soft CTAs (est. +10-20% organic CTR)
- **Editorial sections lack CTAs**: after explaining CUG pricing, readers have no next step. Added CTA paragraphs for all 3 sites
- **8 new/rewritten FAQ items** drafted with full copy ready for config insertion, including the critical legitimacy, cancellation, and payment FAQs
- **5 loading state microcopy improvements** that personalise wait states ("Checking your member price…" vs "Loading live rate…")
- Total of 14 prioritised implementation items from Run 5, with 4 rated P0

**Track 2 COMPLETE.** Deliverable: `copy-audit-improvements.md` (comprehensive across 2 runs covering all user-facing copy: CTAs, hero, modals, search, booking flow, FAQs, editorials, error messages, meta/OG tags, schema descriptions)

**Next run:** Run 6 — Track 3 (Trust & Social Proof) begins. Research what trust signals convert best for luxury travel booking, propose specific additions to the template.

---

## Run 6 — 2026-03-13
**Track:** 3 (Trust & Social Proof — Part 1)
**Task:** Comprehensive research on trust signals for luxury travel booking, audit of current template trust elements, and creation of 7-proposal implementation plan with code snippets
**Output:** `trust-signals-plan.md`
**Key findings:**
- **Trust strip already exists but is hidden via CSS** — re-enabling it is a zero-effort P0 win (same pattern as anchor pricing from Track 1)
- **Booking modal has ZERO trust signals near payment** — this is the #1 gap. Adding security badges near payment forms showed 30–42% conversion increases in hotel booking case studies (VeriSign/Blue Fountain Media)
- **61% of users abandon without trust logos** and 17% abandon specifically due to credit card trust issues (Baymard Institute) — critical for a platform charging £200–£1,000+/night
- **Real-time social proof toasts** (Booking.com's "12 people looking at this property") show 18% average conversion increase (Nudgify data)
- **Price-match guarantee is universal** among competitors (Hilton, IHG, Booking.com, Mr & Mrs Smith) — Lite-Stack's CUG model genuinely undercuts public rates, making this extremely low-risk
- **"How do you get these prices?" is the #1 objection** for CUG platforms — addressing objections on-page increased conversions by 35% (Conversion Rate Experts / sunshine.co.uk)
- 7 proposals drafted with full HTML/CSS/JS code snippets, ordered by priority: (1) Re-enable trust strip, (2) Payment security badges, (3) Social proof toasts, (4) Price-match guarantee, (5) Pricing explainer, (6) Booking modal scarcity, (7) Member activity counter
- Estimated cumulative impact: +30–50% booking conversion from full implementation

**Next run:** Run 7 — Continue Track 3 with implementation of P0 items (CSS unhide trust strip + add payment badges to booking modal) directly in template.html, or begin Track 4 (Booking Funnel Optimization) if Track 3 research coverage is sufficient.

---

## Run 7 — 2026-03-13
**Track:** 3 (Trust & Social Proof — final)
**Task:** Deep-dive research into press/media trust signals, review aggregation, ethical social proof design, and money-back guarantees. Added 4 new proposals (8–11) with full implementation code.
**Output:** Appended to `trust-signals-plan.md`
**Key findings:**
- **"As Featured In" press logo strips drive 12–260% conversion lifts** — DocSend saw 260% from enterprise logos, AmpiFire saw 300% more signups. For Lite-Stack, requires genuine press coverage first (pitched as Phase 2 with Condé Nast Traveller, The Points Guy, Head for Points targets)
- **93% of travellers read reviews before booking** (TripAdvisor/Phocuswright). A 1-star increase in online ratings = 5–9% revenue increase (Harvard Business School). Lite-Stack's `.hotel-stars` exists but is hidden — proposed review aggregation display using LiteAPI data with Booking.com-style rating labels
- **Revised social proof approach for GDPR/ethical compliance** — replaced simulated toast notifications (Proposal 3) with truthful alternatives. EU Digital Services Act prohibits dark patterns including fake urgency; UK CMA investigated Booking.com for misleading urgency claims. Proposed 3 ethical alternatives: (A) aggregate statistics, (B) PostHog-powered real data, (C) static member count
- **"Book with Confidence" compound guarantee** — combining price-match, free cancellation, and no-hidden-fees into a stacked vertical list (Booking.com pattern). Every major OTA uses this: Booking.com refunds difference 24h pre-arrival, Hotels.com matches until day before, Priceline VIP offers 200% refund
- **Implementation-ready config changes** drafted for all 3 sites (LuxStay, Dubai Ultra, Maldives Escape) including trust strip copy, press logo placeholder, and member count fields
- Updated priority matrix to 11 proposals with revised cumulative impact estimate of +35–60% conversion

**Track 3 COMPLETE.** Deliverable: `trust-signals-plan.md` (comprehensive across 2 runs — 11 proposals covering trust strip, payment badges, social proof, price guarantees, pricing explainer, scarcity signals, member counter, press logos, review aggregation, ethical social proof framework, and "Book with Confidence" guarantee)

**Next run:** Run 8 — Track 4 (Booking Funnel Optimization) begins. Will analyse the current 3-step booking flow, map friction points, research Booking.com/Hotels.com checkout patterns, and propose UX improvements.

---

## Run 8 — 2026-03-13
**Track:** 4 (Booking Funnel Optimization — Part 1)
**Task:** Full friction-point audit of the 3-step booking modal (template.html lines 479–1031), web research on OTA checkout best practices, and creation of 10 prioritised improvement proposals with implementation code
**Output:** `booking-funnel-optimization.md`
**Key findings:**
- **12 friction points identified** in the current booking flow, ordered by severity (4× P0, 4× P1, 4× P2)
- **#1 friction point: Guest details not pre-filled** — Google sign-in captures email + name but the booking form starts blank. Pre-filling 3 of 4 fields for Google users means they only enter a phone number. Express booking with saved details boosts repeat transactions +20% (Ralabs 2025)
- **#2 friction point: Price disappears after Step 1** — member price shown in Summary, then hidden for Guest Details and Payment steps. Baymard confirms persistent price visibility is critical — 49% of abandonments relate to cost anxiety
- **#3 friction point: Raw API errors exposed** — `${e.message}` interpolated into user-facing HTML across 4 error paths, potentially showing "Status 500" or "ECONNRESET" at the payment stage
- **#4 friction point: No back navigation** — users can't return to previous steps to review/correct, only close entirely and restart
- **10 concrete proposals with full code snippets:** persistent price bar, auto-fill guest details, smart phone input with country codes, back navigation, prebook expiry timer, human-friendly errors, inline validation, exit-intent recovery, referral confirmation page, per-night price breakdown
- **5 quick wins identified (Proposals 2, 1, 6, 4, 10):** all low-effort, no dependencies, combined estimated impact of +20–32% booking funnel completion
- **OTA feature-parity comparison table:** Lite-Stack currently matches 0/10 OTA best practices; with all proposals implemented it would match 9/10 (only mobile wallets require LiteAPI dependency)

**Next run:** Run 9 — Continue Track 4 with deeper research on mobile checkout patterns, BNPL for luxury travel, and accessibility audit of the booking flow. Or begin Track 5 (Landing Page & SEO Content) if Track 4 coverage is sufficient.

---

## Run 9 — 2026-03-13
**Track:** 4 (Booking Funnel Optimization — final)
**Task:** Mobile checkout deep-dive, BNPL/flexible payment research, WCAG 2.2 accessibility audit of booking modal, and 6 new proposals (11–16)
**Output:** Appended to `booking-funnel-optimization.md`
**Key findings:**
- **Mobile checkout abandonment is 85.65%** vs 73.76% desktop — yet mobile drives 72% of traffic. Lite-Stack's modal was designed desktop-first with no mobile breakpoints, sub-44px touch targets, and inputs that trigger iOS auto-zoom
- **Mobile wallets are the #1 mobile conversion lever:** Hotel Tonight saw 65% higher booking completion with Google Pay payment sheets; Apple Pay delivers 50% faster checkout and 45% adoption when offered (Selfbook). Proposed express checkout slot (Proposal 12) for Payment Request API
- **BNPL is now standard for luxury travel:** Expedia/Affirm, Hotels.com/Affirm, Vrbo/Affirm (exclusive 2026), Airbnb/Klarna all offer pay-over-time. Lite-Stack is the only competitor requiring full upfront payment. Proposed Phase 1 (BNPL messaging, no backend) and Phase 2 (Stripe + Affirm/Klarna integration) in Proposal 13
- **11 WCAG 2.2 accessibility failures found** in booking modal, including 3 critical: no `role="dialog"`, no focus trap (Tab escapes modal), no focus management on open/close. Full remediation code provided in Proposal 14
- **Progressive loading states** (Proposal 15) replace generic spinners with multi-step reassurance copy — critical on slow mobile connections where prebook can take 5–15 seconds
- **Confirmation page cross-sell** (Proposal 16) transforms the "Done" dead-end into engagement hub: referral prompt at peak sentiment (est. 5–8% share rate vs <1% from footer), calendar download, and browse-more CTA
- **Updated priority matrix to 16 proposals** — 11 are quick wins (no dependencies, low effort). Combined estimated impact: +30–50% booking funnel completion
- **OTA feature-parity score:** Current 0/14 → Proposed 14/14, surpassing competition on 2 features (post-booking engagement, referral at confirmation)

**Track 4 COMPLETE.** Deliverable: `booking-funnel-optimization.md` (comprehensive across 2 runs — 16 proposals covering persistent pricing, auto-fill, phone input, navigation, timers, errors, validation, exit-intent, referrals, price breakdown, mobile layout, mobile wallets, BNPL, accessibility, loading states, and confirmation cross-sell)

**Next run:** Run 10 — Track 5 (Landing Page & SEO Content) begins. Research and draft content for organic conversions: city/destination landing pages, FAQ content addressing booking objections, schema markup, meta descriptions, and OG tags.

---

## Run 10 — 2026-03-14
**Track:** 5 (Landing Page & SEO Content — Part 1)
**Task:** Full SEO audit of current template + all 3 configs, web research on hotel SEO best practices (2025–2026), destination landing page copy, objection-handling FAQs, meta description optimization, OG image strategy, and schema markup improvements
**Output:** `landing-content-seo.md`
**Key findings:**
- **8 critical SEO gaps identified**, including: no OG images configured (est. -40–50% social CTR), no FAQPage schema (missing rich snippets), no Organization schema (no Knowledge Graph presence), `seo_regions`/`seo_amenity_pages` defined in configs but generator doesn't create them (zero organic traffic from 25 long-tail pages)
- **3 production-ready destination landing pages drafted**: LuxStay "UK Travellers to Dubai," Dubai Ultra "Indian Travellers to Dubai," Maldives Escape "UK Honeymoon & Couples" — with full HTML, SEO-optimised copy, and keyword targeting
- **Landing page template structure** defined for remaining 9 regional pages across all 3 sites
- **5 objection-handling FAQs written** (all 3 brand variants): "Is this legit?", "How do you get these prices?", "What if I need to cancel?", "Is my payment secure?", "Why do I need to sign up?" — addressing the trust gap that Track 2 (Copy Audit) identified as the #1 conversion blocker
- **Meta descriptions rewritten for all 3 sites**: front-loaded with competitor comparison ("vs Booking.com"), specific savings ranges, and named properties. All under 155 chars.
- **OG image strategy**: 1200×630px branded images per site, with quick-win alternative using dynamic OG image generation via Cloudflare Worker
- **Schema markup additions**: FAQPage schema (P0, 30 min), Organization schema (P1, 15 min), BreadcrumbList schema (P2, for landing pages), improved SCHEMA_DESCRIPTION with named properties for AI citation
- **SEO landing page generator spec**: proposed `generate.js` enhancement to create 25 indexed landing pages from existing config data — estimated +200–800 organic sessions/month within 3–6 months
- **10-item priority roadmap**: items 1–5 are quick wins (1 hour total, zero dependencies) with combined +20–40% organic CTR and +35% conversion impact

**Track 5 in progress.** Next run (Run 11) will continue Track 5 with remaining regional page copy, XML sitemap generation, robots.txt optimization, and canonical URL strategy.

---

## Run 11 — 2026-03-14
**Track:** 5 (Landing Page & SEO Content — continued)
**Task:** Remaining 9 regional landing pages, XML sitemap generation, robots.txt strategy, canonical URL strategy, llms.txt
**Output:** Appended to `landing-content-seo.md`
**Key findings:**
- **9 production-ready regional landing pages drafted** completing all `seo_regions` across all 3 sites: LuxStay (Heathrow, Manchester/North, GCC visitors), Dubai Ultra (UK travellers, GCC weekend escape, Australian travellers), Maldives Escape (GCC travellers, US travellers, German/European travellers) — each with full HTML, localised currency savings, flight info, and booking window guidance
- **XML sitemap generator spec with full code**: `sitemap-generator.js` module that integrates into `generate.js`, auto-generates sitemap.xml per site at build time including homepage + all SEO landing pages. Expected 10 URLs (LuxStay), 9 URLs (Dubai Ultra), 9 URLs (Maldives Escape) — 28 total indexed pages across 3 sites
- **robots.txt strategy**: allow Googlebot/Bingbot, block AI training crawlers (GPTBot, CCBot, anthropic-ai, Google-Extended, FacebookBot) to protect CUG pricing data from LLM training datasets. Full generator code provided
- **Canonical URL strategy**: self-referencing canonicals on all pages, dynamic `{{CANONICAL_URL}}` template variable, trailing-slash consistency rules, Netlify redirect configuration, and hreflang implementation plan for German landing page
- **llms.txt specification**: emerging AI discoverability standard — allows AI assistants to describe the brand while robots.txt blocks training data scraping. Draft provided for all 3 sites
- **Updated priority roadmap**: expanded from 10 to 14 items. New quick wins from Run 11 (robots.txt, sitemap, llms.txt, trailing-slash redirects) add ~1.25 hours of zero-dependency work. Total P0 implementation: ~2.25 hours
- **German-language section included** for Maldives Escape DACH landing page — bilingual approach targeting "Maldives Luxus Resorts" German-language queries

**Track 5 in progress (2/3 runs complete).** Next run (Run 12) will complete Track 5 with: amenity page copy for all 13 `seo_amenity_pages`, SEO landing page template HTML, and internal linking strategy.

---

## Run 12 — 2026-03-14
**Track:** 5 (Landing Page & SEO Content — final)
**Task:** All 13 amenity page copy, SEO landing page HTML template (`template-landing.html`), generator enhancement spec, internal linking strategy (hub-and-spoke architecture)
**Output:** Appended to `landing-content-seo.md`
**Key findings:**
- **13 production-ready amenity pages drafted** across all 3 sites: LuxStay (5: London spa, London rooftop bar, Dubai beach, Dubai infinity pool, Bangkok rooftop pool), Dubai Ultra (4: Palm spa, Palm beach, Marina rooftop, Downtown pool), Maldives Escape (4: overwater villa, spa, diving, adults-only) — each with full H1/H2 structure, meta title/description, target keywords, featured hotel copy, "What to Expect" guidance, and 2–4 FAQs
- **SEO landing page HTML template** (`template-landing.html`) designed: reuses main template's design system (fonts, colours, nav), adds BreadcrumbList schema, FAQPage schema, canonical URL, and responsive article layout. Lightweight — no JavaScript dependency, pure HTML/CSS
- **Generator enhancement spec** with full code: extends `generate.js` to read `seo_amenity_pages` and `seo_regions` from configs, apply landing page template, inject pre-written copy from `landing-copy.json`, and generate subdirectory pages. Includes FAQ schema auto-generator helper function
- **Hub-and-spoke internal linking architecture** designed for all 3 sites: homepage as hub, 8–9 spoke pages per site, with 5 linking rules (hub→spokes, spokes→hub, spoke↔spoke cross-links, descriptive anchor text, max 2–3 clicks depth)
- **Cross-link matrix** mapping all 13 amenity pages to their 2–3 most relevant cross-link targets — designed to distribute link equity while maintaining topical relevance
- **Homepage "Explore" section** proposed with pre-written link text for all 3 sites — serves as the hub→spoke internal linking foundation
- **Amenity pages target long-tail keywords** with 3–5× higher conversion rates than generic "hotels in [city]" terms — research shows 65% organic traffic increase from localized content silo strategy within 6 months (DataFirst Digital)
- **Updated priority roadmap** expanded to 18 items: 4 new items from Run 12 (template creation, copy population, explore section, cross-link data) totalling ~5.5 hours. Full Track 5 implementation: ~15–20 hours for complete SEO overhaul

**Track 5 COMPLETE.** Deliverable: `landing-content-seo.md` (comprehensive across 3 runs — full SEO audit, 12 regional landing pages, 13 amenity landing pages, XML sitemap generator, robots.txt strategy, canonical URLs, llms.txt, landing page HTML template, generator enhancement spec, and hub-and-spoke internal linking strategy)

---

## 🏁 SPRINT COMPLETE — All 5 Tracks Finished

## Sprint Status
| Track | Status | Deliverable |
|-------|--------|-------------|
| 1. Competitor UX Teardowns | ✅ Complete (3/3 runs) | competitor-ux-teardown.md |
| 2. Copy & Messaging Audit | ✅ Complete (2/2 runs) | copy-audit-improvements.md |
| 3. Trust & Social Proof | ✅ Complete (2/2 runs) | trust-signals-plan.md |
| 4. Booking Funnel Optimization | ✅ Complete (2/2 runs) | booking-funnel-optimization.md |
| 5. Landing Page & SEO Content | ✅ Complete (3/3 runs) | landing-content-seo.md |

## Total Sprint Output (12 Runs)
- **5 comprehensive research documents** totalling ~275K characters
- **4 competitor deep-dives** (Secret Escapes, Mr & Mrs Smith, Luxury Escapes, SLH)
- **10 copy improvements** with conversion impact estimates
- **11 trust signal proposals** with implementation code
- **16 booking funnel improvements** with full code snippets
- **12 regional landing pages** (all `seo_regions` across 3 sites)
- **13 amenity landing pages** (all `seo_amenity_pages` across 3 sites)
- **1 landing page HTML template** (`template-landing.html`)
- **1 generator enhancement spec** (extend `generate.js`)
- **1 internal linking architecture** (hub-and-spoke with cross-link matrix)
- **XML sitemap generator**, robots.txt strategy, canonical URL strategy, llms.txt
- **18-item prioritised roadmap** with effort estimates and dependency mapping

## Recommended Implementation Order (Quick Wins First)
1. **Hour 1:** Items 1–7 (FAQPage schema, FAQ content, meta descriptions, schema descriptions, Organization schema, robots.txt, sitemap) — zero dependencies, immediate SEO impact
2. **Hour 2:** Items 13, 14, 17 (llms.txt, trailing-slash redirects, homepage Explore section) — zero dependencies, internal linking + AI discoverability
3. **Hours 3–4:** Item 15 (create `template-landing.html`) — foundation for all landing pages
4. **Hours 5–8:** Items 9, 16 (landing page generator + populate amenity copy) — enables all 25 landing pages
5. **Hours 9–10:** Items 10, 11, 12, 18 (regional copy, canonicals, breadcrumbs, cross-links) — completes the full SEO architecture
6. **When ready:** Item 8 (OG images) — requires design assets but delivers +40–50% social CTR
