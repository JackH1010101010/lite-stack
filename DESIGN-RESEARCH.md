# LuxStay Design Research — Complete Findings

*Compiled March 2026. Based on analysis of Aman, Mr & Mrs Smith, Design Hotels, Secret Escapes, and 40+ design sources.*

---

## 1. The Problem in One Sentence

LuxStay currently looks like a discount aggregator wearing a suit — the economics are Secret Escapes, but the aesthetics are closer to Groupon.

**Visual evidence from live site (luxury.lux-stay-members.com):**

- `{{HREFLANG_TAGS}} {{EMAILJS_SCRIPT}}` visible at top of page (unresolved template vars)
- `{{AFFILIATE_NAV_HTML}}` visible in navigation
- "5-STAR HOTELS · MEMBERS SAVE 10–30%" eyebrow screams deal site
- "Member prices hidden" banner with gold background = coupon aesthetic
- Trust strip with 4 checkmarks = Booking.com pattern
- Filter chips (All / Pool / Spa / Views) for just 6 hotels = false complexity
- Horizontal hotel cards with 180px images = cramped, transactional
- Struck-through pricing + "2% off" badges = penny-pinching signal

---

## 2. Competitive Positioning Map

| Attribute | Aman | Mr & Mrs Smith | Design Hotels | Secret Escapes | LuxStay Current | LuxStay Target |
|-----------|------|---------------|---------------|----------------|-----------------|----------------|
| **Aesthetic** | Meditative minimalism | Editorial magazine | Design-forward | Deal-driven | Deal-dressed-as-luxury | Editorial with deals |
| **Typography** | Custom serif | Playfair Display + Proxima Nova | Clean sans-serif | System fonts | System fonts | Inter/DM Sans + Serif accent |
| **Photography** | Full-viewport, cinematic | Magazine-quality, lifestyle | Architecture-focused | Flash-sale thumbnails | 180px placeholder cards | Large vertical cards |
| **Whitespace** | 50-60% of page | Generous, editorial | Balanced | Minimal | Minimal | 40%+ of page |
| **Price display** | Hidden (you ask) | Subtle, secondary | Secondary | Central, urgent | Central, struck-through | Present but quiet |
| **CTA style** | "Reserve" text link | "Search" with arrow | "Search" pill | "Unlock deals" button | "Book now" navy button | "View details →" text |
| **Card layout** | Vertical, image-dominant | Vertical, editorial | Vertical, photo-first | Horizontal thumbnails | Horizontal, 180px img | Vertical, 300px+ img |
| **Colour** | Cream + charcoal + earth | Cream + black + muted red | Neutral + black | Dark grey + orange | Navy + saturated gold | Warm neutrals + bronze |
| **Brand voice** | Aspirational, serene | Witty, personal, insider | Design-intellectual | Urgency, scarcity | Generic promotional | Confident, editorial |

**Target positioning: "Secret Escapes economics with Mr & Mrs Smith aesthetics"**

---

## 3. What the Best Sites Actually Do

### Aman (aman.com)

**Key design moves:**
- Custom serif typeface by Construct — light weight, stone-carving-inspired letterforms
- Cream/warm-white background (#F5F1ED), never pure white
- Category labels: all-caps, 10-12px, letter-spacing 0.1-0.15em
- Property cards: vertical layout, tall images (3:4 or 4:5), no pricing visible
- Sections separated by 60-120px+ of vertical whitespace
- One focus per viewport — hero image, then text, then next section
- "Reserve" button: dark charcoal with white text, no colour accent
- Hover effects: subtle 1.02-1.05x image zoom, 300-500ms transitions
- **No prices, no ratings, no review counts** on listing pages

**The lesson: Confidence through omission.** Aman doesn't try to convince you. It assumes you already know.

### Mr & Mrs Smith (mrandmrssmith.com)

**Key design moves:**
- **Playfair Display** (high-contrast serif) for headlines — communicates editorial authority
- **Proxima Nova** (geometric-humanist sans) for body/UI — readable, functional
- "Smith Red" accent — muted, sophisticated, not aggressive
- "Decoratively restrained so that the content could shine through" — their design brief
- Hotels are curated by invitation only — this IS the editorial content
- Hotel pages read like magazine features with personal narrative from editors
- Search bar uses "Where would you like to go?" placeholder — conversational, not transactional
- Fixed booking widget present but not dominant
- Progressive disclosure — editorial leads, booking mechanics follow

**The lesson: Editorial voice IS the product.** Every hotel description is a recommendation from a trusted friend, not a product listing.

### Design Hotels (designhotels.com)

**Key design moves:**
- Full-viewport hero video with subtle play/pause control
- Category icons at bottom (All Hotels, New, City, Beach, etc.)
- Black and white palette with minimal accent colour
- "Journal" section integrates editorial content into main nav
- Hotel names overlaid on images in elegant small type
- Search is a single unified bar: destination | dates | guests | Search

**The lesson: Categorisation as curation.** The category system (Gastronomy Hotels, Countryside, Wellness) frames browsing as discovery, not shopping.

### Secret Escapes (secretescapes.com)

**Key design moves:**
- Gate everything behind email signup (you can't browse without joining)
- "Over 20 million members in the UK" social proof at top
- Orange CTA buttons — urgency colour
- "Unlock deals for free" — deal-focused language throughout
- Background: dark, moody hotel photography behind the signup wall
- Once logged in: flash-sale grid with countdown timers, heavy imagery

**The lesson: This is the economic model to copy, but NOT the visual language.** Secret Escapes proves the CUG model works at scale, but their design is pure urgency/scarcity. LuxStay should take the economics and dress them in Mr & Mrs Smith's clothes.

---

## 4. Design Principles That Apply

### Edward Tufte: Data-Ink Ratio

**Core idea**: Maximise the proportion of visual elements that communicate actual information. Remove everything else.

**Applied to LuxStay:**
- The struck-through price, "% off" badge, "Best Value" tag, and star rating on hotel cards are all low-information visual noise
- A hotel card should contain: one great photo, the hotel name, the location, and the price. Everything else is chartjunk
- Tufte's "smallest effective difference" — price should be visible but not screaming
- Comparison tables in guides should use typography and spacing, not coloured backgrounds and borders

### Dieter Rams: Less, But Better

**Applied to LuxStay:**
- Every UI element must serve booking or information discovery — if it doesn't help the user choose or book a hotel, remove it
- Trust strip, filter chips, member banner: these serve the site, not the user
- "As little design as possible" — whitespace and silence ARE design choices
- Limit to 2-3 core colours + neutrals. Currently using navy, gold, green, red, multiple greys

### Kenya Hara: White Space as Potential (Ma)

**Applied to LuxStay:**
- The space between hotel cards matters as much as the cards themselves
- Currently: 16px gap between cards. Should be: 32-48px minimum
- Hero section should breathe — one confident line, not headline + subline + eyebrow
- Full-viewport image with minimal text creates cinematic pause that signals luxury

### Swiss Typography: Grid, Hierarchy, Objectivity

**Applied to LuxStay:**
- Build layout on an 8px baseline grid (currently inconsistent: 4px, 6px, 8px, 12px, 16px, 20px, 24px all mixed)
- Establish hierarchy through size and weight, not decoration
- Line length: 50-75 characters for readability (currently unconstrained in places)
- Left-aligned text, always. Centre-aligned hero text is acceptable for display.

### Quiet Luxury: Restraint, Craft, Subtlety

**Applied to LuxStay:**
- Gold #c9a84c at full saturation reads "deal badge" → shift to muted bronze #8c7851
- Pure white #fff is cold → shift to warm cream #f9f7f4
- Font weight 700 (bold) is loud → 400-500 (regular-medium) whispers luxury
- "Book now" buttons on every card = pressure → "View details →" text link = invitation
- Show one excellent photo per hotel, not a gallery of mediocre ones

---

## 5. The Specific Changes

### Typography

**Current**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif` — generic, reads as "web app"

**Recommended**:
```css
/* Primary: Inter or DM Sans (both free, both excellent on screen) */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Accent: Instrument Serif or Cormorant Garamond (for hero headlines only) */
--font-serif: 'Instrument Serif', Georgia, serif;

/* Scale (Major Third 1.25 ratio) */
--text-sm: 13px;
--text-base: 16px;
--text-lg: 20px;
--text-xl: 25px;
--text-2xl: 32px;
--text-3xl: 40px;
--text-4xl: 50px;

/* Weights: mostly 400-500, never 700 except logo */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600; /* sparingly */
```

**Why Inter or DM Sans?**
- Mr & Mrs Smith uses Proxima Nova (similar geometric-humanist hybrid)
- Inter is free, has excellent screen rendering, and 9 weights
- DM Sans is slightly warmer, more approachable
- Both have large x-heights for readability at small sizes

**Why serif accent?**
- Mr & Mrs Smith uses Playfair Display for editorial authority
- Instrument Serif is lighter, more modern — doesn't scream "wedding invitation"
- Use ONLY for hero headlines and guide page titles
- Creates immediate "editorial" signal that differentiates from booking engines

### Colour

**Current palette → Target palette:**

| Role | Current | Target | Why |
|------|---------|--------|-----|
| Background | #f7f7f5 | #f9f7f4 | Warmer, more cream |
| Text | #1a1a1a | #2a2a2a | Slightly softer, less stark |
| Accent | #c9a84c (saturated gold) | #8c7851 (muted bronze) | Quiet luxury, not coupon |
| Border | #e5e3de | #e8e5e0 | Marginally warmer |
| Muted text | #6b6b6b | #9b8961 (warm) or #a39e8d | Earth tone, not grey |
| CTA | #1a2744 (navy) | #2a2a2a (charcoal) | Less corporate, more fashion |
| Success | #1a7a3c (green) | Remove | No "savings" signals |
| Error | #b91c1c | Keep (functional) | |

**Full CSS variables:**
```css
:root {
  --bg: #f9f7f4;
  --text: #2a2a2a;
  --text-muted: #a39e8d;
  --accent: #8c7851;
  --border: #e8e5e0;
  --surface: #ffffff;
  --cta: #2a2a2a;
  --cta-text: #f9f7f4;
  --error: #b91c1c;
  --error-bg: #fef2f2;
}
```

### Spacing System

**Current**: No consistent system (4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64 all appear)

**Target: Strict 8px scale:**
```css
:root {
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-6: 48px;
  --space-8: 64px;
  --space-10: 80px;
  --space-12: 96px;
  --space-15: 120px;
}
```

**Key spacing changes:**
- Hotel card gap: 16px → 32px
- Section padding: mixed → 80-120px top/bottom
- Card internal padding: 16px → 24px
- Hero padding: 48px top → 80px top

### Hotel Card Redesign

**Current (horizontal, 180px image):**
```
┌──────────────────────────────────┐
│ [180×160 img] │ Name ★★★★★     │
│               │ Location         │
│               │ Description...   │
│               │ [tag] [tag]      │
│               │ £359→£353 2% off │
│               │ [Book now]       │
└──────────────────────────────────┘
```

**Target (vertical, image-dominant):**
```
┌─────────────────────┐
│                     │
│   [Full-width       │
│    image, 3:2       │
│    aspect ratio,    │
│    300px+ tall]     │
│                     │
├─────────────────────┤
│ Hotel Name          │
│ Location            │
│                     │
│ From £353/night     │
│ View details →      │
└─────────────────────┘
```

**What's removed:**
- Stars (all are 5-star, redundant)
- Description text (save for detail page)
- Tags/pills (noise at browse level)
- Struck-through price (deal signal)
- "% off" badge (penny-pinching)
- "Best Value" badge (TripAdvisor aesthetic)
- "Book now" button (too aggressive)
- "Member" badge (unnecessary when you're already logged in)

**CSS approach:**
```css
.hotel-card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  transition: box-shadow 0.3s ease;
}

.hotel-card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

.hotel-card img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.hotel-card-body {
  padding: 24px;
}

.hotel-name {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.hotel-location {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.hotel-price {
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.hotel-cta {
  font-size: 14px;
  color: var(--accent);
  text-decoration: none;
  letter-spacing: 0.02em;
}

.hotel-cta:hover {
  text-decoration: underline;
}
```

### Hero Simplification

**Current:**
```
[navy background]
5-STAR HOTELS · MEMBERS SAVE 10–30%        ← promotional, urgency
Luxury hotel rates you won't find on        ← negative framing
Booking.com
Member-only pricing on 5-star hotels...     ← redundant
[search bar]
🔒 Member prices hidden. Join free...       ← coupon banner
✓ Live rates ✓ No min stay ✓ Members save  ← trust strip
Filter: [All] [Pool] [Spa] [Views]          ← false complexity
```

**Target:**
```
[warm cream background or full-bleed hotel photo]

Curated luxury hotels                       ← confident, simple
at member-only rates                        ← one benefit, stated once

[search bar]

[hotels immediately]                        ← no barriers between search and results
```

**What's removed:**
- "5-STAR HOTELS" eyebrow (redundant — all are 5-star)
- "MEMBERS SAVE 10-30%" (urgency language)
- "you won't find on Booking.com" (defines self by competitor)
- "Member prices hidden" banner (coupon aesthetic)
- Trust strip (Booking.com pattern)
- Filter chips (unnecessary for 6 hotels per city)

### Navigation

**Current**: Gold logo | {{AFFILIATE_NAV_HTML}} | How it works | [Join free]

**Target**:
```
LuxStay                    London  Dubai  Bangkok  Guides        Sign in
```
- Logo: weight 500, letter-spacing 0.06em (not 700)
- Destinations as nav items (not hidden in dropdown)
- "Guides" links to editorial content
- "Sign in" replaces "Join free" (less aggressive; joining happens naturally at booking)
- No background colour on nav (just bottom border-line)
- Generous padding: 20px vertical

### Border Radius

**Current**: Inconsistent (3px, 4px, 6px, 8px, 10px, 12px, 20px)

**Target**: Standardise to three values:
```css
--radius-sm: 4px;   /* buttons, inputs, tags */
--radius-md: 8px;   /* cards, modals */
--radius-lg: 16px;  /* hero elements, large containers */
```

### Buttons

**Current**: Too many variants (navy, gold, green, transparent, multiple sizes)

**Target**: Two button styles only:
```css
/* Primary: dark, for key actions only */
.btn-primary {
  padding: 14px 32px;
  background: var(--cta);
  color: var(--cta-text);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.03em;
  border: none;
  border-radius: var(--radius-sm);
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.85; }

/* Secondary: outline, for everything else */
.btn-secondary {
  padding: 14px 32px;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.03em;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}
.btn-secondary:hover {
  border-color: var(--text);
}
```

---

## 6. Implementation Priority

### Phase 1: Typography + Colour (1-2 hours, highest impact)

Changes:
1. Add Google Fonts link: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">`
2. Replace font-family across all elements
3. Replace --gold (#c9a84c) with --accent (#8c7851)
4. Replace --navy (#1a2744) with --cta (#2a2a2a) on buttons
5. Change body background to #f9f7f4
6. Reduce all font-weight: 700 to 500 (except logo: 600)
7. Fix the unresolved template variables ({{HREFLANG_TAGS}}, {{EMAILJS_SCRIPT}}, {{AFFILIATE_NAV_HTML}})

### Phase 2: Strip Noise (1 hour)

Remove:
1. "5-STAR HOTELS · MEMBERS SAVE 10–30%" eyebrow
2. "Member prices hidden" / "Member rates unlocked" banner
3. Trust strip (4 checkmarks)
4. Filter chips (All / Pool / Spa / Views)
5. Struck-through prices on hotel cards
6. "% off" savings badges
7. "Best Value" / "Member" image badges
8. Star ratings on cards (redundant — all 5-star)
9. Hotel description text on cards (save for detail)

### Phase 3: Hotel Card Redesign (2 hours)

Convert from horizontal (180px image left, content right) to vertical (full-width image top, minimal content below). Grid layout: `repeat(auto-fill, minmax(300px, 1fr))` with 32px gap.

### Phase 4: Hero + Nav (1 hour)

Simplify hero to one line + search bar. Update nav to show destinations. Remove navy background, use warm cream or photograph.

### Phase 5: Guide Pages (1 hour)

Guide pages are already closer to target aesthetic. Align typography and colour with main site changes. These are the strongest content — they should be the design standard the main page moves toward.

---

## 7. Key Metrics to Watch After Redesign

| Metric | Current Baseline | Target | Tool |
|--------|-----------------|--------|------|
| Bounce rate | Unknown (check PostHog) | < 50% | PostHog |
| Time on site | Unknown | > 2 min | PostHog |
| Search initiated rate | Unknown | > 40% | PostHog `search_initiated` event |
| Hotel card click rate | Unknown | > 15% | PostHog `hotel_viewed` event |
| Booking started rate | Unknown | > 5% of searches | PostHog `booking_started` event |
| Booking completed rate | Unknown | > 2% of searches | PostHog `booking_completed` event |
| Join/signup rate | Unknown | > 10% of visitors | PostHog `user_registered` event |

---

## 8. Template Variable Bug (Urgent Fix)

The live site at luxury.lux-stay-members.com currently shows unresolved Mustache-style template variables visible to customers:

- `{{HREFLANG_TAGS}}` — appears at very top of page
- `{{EMAILJS_SCRIPT}}` — appears at very top of page
- `{{AFFILIATE_NAV_HTML}}` — appears in the navigation bar

These exist because `sites/luxstay/index.html` is a hand-edited file that diverged from the generator output. The generator (`generator/generate.js`) replaces these variables, but manual edits to the output file bypassed regeneration.

**Fix**: Either regenerate from the generator (which handles all variables), or manually replace these three variables in `sites/luxstay/index.html`:
- `{{HREFLANG_TAGS}}` → empty string (or proper hreflang tags if multi-language)
- `{{EMAILJS_SCRIPT}}` → empty string (or the EmailJS embed if configured)
- `{{AFFILIATE_NAV_HTML}}` → empty string (referral programme is removed)

---

## 9. Sources

### Competitor Analysis
- Aman brand identity by Construct (bpando.org)
- Aman website design case study (nucleus.co.uk)
- Mr & Mrs Smith web design by D3R (d3r.com)
- Mr & Mrs Smith font analysis: Playfair Display + Proxima Nova
- Design Hotels at designhotels.com (visual analysis)
- Secret Escapes at secretescapes.com (visual analysis)

### Design Principles
- Edward Tufte, "The Visual Display of Quantitative Information" — data-ink ratio
- Dieter Rams, 10 Principles of Good Design (IxDF)
- Kenya Hara, "White" and "Designing Design" — emptiness as potential
- International Typographic Style / Swiss Typography (Medium, Design Bootcamp)
- Quiet luxury design principles (Victorious Interiors)
- Bottega Veneta's logo-free philosophy (Borro)

### Typography & Colour
- Modular scale typography (artattackk.com)
- Font size guidelines for responsive websites (learnui.design)
- Golden ratio in design (Elegant Themes)
- Luxury hotel website typography trends 2025

### Conversion & UX
- Hotel booking conversion optimization (industry benchmarks: 1.5-3% baseline)
- Mobile-first hotel design (65% traffic mobile, but 0.7% vs 2.4% desktop conversion)
- Photography impact on hotel bookings (up to 15% increase)
- Editorial commerce blending patterns
