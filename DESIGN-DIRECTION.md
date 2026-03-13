# LuxStay Design Direction

## The Problem

The current site reads as a **deal site wearing a suit**. Navy/gold palette is fine, but the density of conversion tactics — struck-through prices, percentage badges, "Member rates unlocked" banners, trust bullet strips, filter chips — signals Groupon, not Aman. The people booking £500–3,000/night hotels don't respond to urgency. They respond to restraint.

The design needs to move from **transactional** to **editorial**. The booking should feel like discovering something, not being sold something.

---

## Current Issues (Specific)

| Element | Problem | Fix Direction |
|---------|---------|---------------|
| Nav | Sticky dark navy, cramped, system font | Lighter, more breathing room, proper typeface |
| Hero | Dark navy slab with centred text, search bar with shadow | Reduce to minimal search; let photography carry the hero |
| "Member rates unlocked" banner | Gold background, "Active" badge — reads like a coupon | Remove entirely or reduce to single subtle line |
| Trust strip | 4 checkmarks in a bordered box — Booking.com pattern | Remove or integrate into footer |
| Filter chips | "All / Pool / Spa / Views" — small, pill-shaped | Simplify; consider removing (only 6 hotels per city) |
| Hotel cards | 180px thumbnail, bold name, struck-through price, green "% off" badge, "Book now" button | Larger image, quieter pricing, remove discount badge, softer CTA |
| "Best Value" badge | Gold overlay on image — TripAdvisor aesthetic | Remove; let the price speak |
| Pricing display | "Retail: £359" struck through → "£353 / night" with "2% off" | Show member price only; comparison is meaningless at 2% |
| Editorial section | Dense paragraph block at page bottom | Move higher; give it an editorial layout with breathing room |
| FAQ accordion | Boxed cards with ▼ indicators | Fine functionally; needs more whitespace |
| Footer | Small text, grey background | Fine; keep minimal |

---

## Design Principles

Drawing from the designers and movements most relevant to luxury digital:

### 1. Dieter Rams — "Less, but better"

Every element must justify its presence. If removing it doesn't hurt comprehension or conversion, remove it. The "Member rates unlocked" banner, the trust strip, the filter chips, the "Best Value" badges, the struck-through retail prices — test removing each one. Luxury is the confidence to show less.

### 2. Kenya Hara / Ma (間) — Emptiness as active design

White space isn't wasted space — it's the most expensive real estate on the page. A hotel card with generous padding around a large photograph, a single name, and a price feels more premium than a card packed with badges, tags, descriptions, and buttons. The emptiness invites the user to fill in their own desire.

### 3. Swiss Typographic Style — Grid discipline

Every element aligns to an 8px baseline grid. Spacing follows a strict scale: 8, 16, 24, 32, 48, 64px — never arbitrary values. Typography uses 2 weights maximum from a single family. This mathematical precision is invisible to users but creates the subliminal feeling of order and quality.

### 4. Quiet Luxury (2024–2026 trend)

No logos repeated on every card. No urgency language. No countdown timers. No "X people are looking at this." CTAs are text links, not shouting buttons. Pricing is present but not emphasised with colour or size. The design says "we don't need to convince you" — which is the most convincing thing of all.

---

## Competitive Positioning

| Site | Model | Pricing Visibility | Design Mood | Whitespace |
|------|-------|--------------------|-------------|------------|
| **Aman** | Direct | Hidden until detail | Aspirational, photographic | 60–70% |
| **Mr & Mrs Smith** | Booking | Hidden until detail | Editorial, curated | 50–60% |
| **Design Hotels** | Booking | Hidden until detail | Gallery, art-forward | 40–50% |
| **Secret Escapes** | Members-only deals | Very prominent | Deal-focused, urgent | 30–40% |
| **LuxStay (current)** | Members-only CUG | Prominent with discounts | Deal-focused trying to be luxury | 25–35% |
| **LuxStay (target)** | Members-only CUG | Present but calm | Editorial, confident | 45–55% |

LuxStay's business model is closest to Secret Escapes, but the target audience books at Aman-tier properties. The design needs to bridge this: **Secret Escapes economics with Mr & Mrs Smith aesthetics.**

---

## Typography

### Current
`-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif` — system font stack. Functional but generic. No personality. Reads as "web app" not "luxury platform."

### Recommended Direction

**Primary typeface**: One high-quality sans-serif throughout. Options (all free/open-source):

- **Inter** — Designed specifically for screens. Excellent at small sizes. Professional but not cold. The safe choice.
- **DM Sans** — Slightly more geometric. Warmer than Inter. Works well for luxury. Good pairing with larger sizes.
- **Outfit** — Modern geometric with a softer feel. Distinctive without being weird. Best "luxury" signal of the three.

**Usage across the scale:**

```
Nav brand:      20px, weight 600, letter-spacing +0.5px
Hero headline:  clamp(28px, 5vw, 48px), weight 500 (not 700)
Hero subline:   18px, weight 400, line-height 1.6
Hotel name:     18px, weight 500
Location:       13px, weight 400, colour #888
Price:          22px, weight 500
"per night":    12px, weight 400, colour #888
CTA:            14px, weight 500, no button styling — text link with subtle arrow
```

Key shift: **weight 500 (medium) instead of 700 (bold)** everywhere. Bold screams; medium speaks.

### Optional: Serif accent

If you want the editorial magazine feel of Mr & Mrs Smith, consider a serif for the hero headline only:

- **Instrument Serif** (Google Fonts) — elegant, contemporary
- **Cormorant Garamond** — classic luxury, works beautifully at large sizes

Pattern: serif for hero H1 only, sans-serif for everything else. This creates a "magazine cover over a functional app" layering.

---

## Colour

### Current
```css
--navy: #1a2744;
--gold: #c9a84c;
--gold-lt: #f5e9c8;
--grey-bg: #f7f7f5;
```

The navy is fine. The gold is too saturated — it reads as "deal badge" rather than "luxury accent." The background is slightly warm, which is good.

### Recommended

```css
--primary:     #1a2744;     /* Keep navy — it's working */
--accent:      #8c7851;     /* Muted bronze — quieter than current gold */
--accent-lt:   #f0ebe3;     /* Warm off-white for subtle highlights */
--bg:          #faf9f7;     /* Slightly warmer background */
--text:        #1a1a1a;     /* Near-black for body text */
--text-muted:  #8a8a8a;     /* For secondary info: location, "per night" */
--border:      #e8e6e1;     /* Warm grey borders */
--surface:     #ffffff;     /* Card backgrounds */
```

Key shift: **gold → bronze**. Gold at full saturation signals prize/deal/discount. A muted bronze signals quiet wealth. Same hue family, less shout.

Remove `--gold-lt` (#f5e9c8) entirely — it's the "Member rates unlocked" banner colour. That banner shouldn't exist.

---

## Photography

### Current
180px × 160px thumbnails on the left of each card. Some are real hotel photos (Shangri-La looks good), some are emoji placeholders on gradient backgrounds. This is the single biggest thing dragging the design down.

### Direction

- **Card images: minimum 300px tall, full card width** (not side-by-side with text)
- Aspect ratio: **3:2 or 16:9** consistently
- Image first, text below — vertical card layout, not horizontal
- No emoji fallbacks — if there's no photo, show a solid colour placeholder with the hotel name centred in light text
- No overlays, no badges on images
- If using real hotel photos from LiteAPI, crop to focus on the signature feature (pool, view, lobby) rather than generic exterior

Photography is 70% of whether a site feels luxury or budget. One large beautiful image communicates more than any amount of text, badges, or trust signals.

---

## Hotel Card Redesign

### Current layout (horizontal)
```
[180px img] [Name (bold, navy)]
            [★★★★★]
            [📍 Location · Distance]
            [Description text]
            [Tag] [Tag] [Tag]
            [Member rate / night]
            [Retail: £359 (struck)]
            [£353 / night]
            [2% off badge]        [Book now button]
```

### Proposed layout (vertical, quiet)
```
┌─────────────────────────────────┐
│                                 │
│     [Full-width photograph]     │  ← 300px min height, 3:2 aspect
│                                 │
├─────────────────────────────────┤
│                                 │  ← 24px padding all sides
│  Royal Lancaster London         │  ← 18px, weight 500
│  Hyde Park, W2                  │  ← 13px, #8a8a8a
│                                 │  ← 16px gap
│                          £353   │  ← 22px, weight 500, right-aligned
│                      per night  │  ← 12px, #8a8a8a, right-aligned
│                                 │  ← 16px gap
│  View details →                 │  ← 14px, weight 500, text link (not button)
│                                 │
└─────────────────────────────────┘

Grid: 3 cards per row on desktop (gap: 24px)
      2 cards per row on tablet
      1 card per row on mobile
```

### What's removed
- ★★★★★ stars (all hotels are 5-star — it's redundant)
- Description text (save for detail view)
- Tag pills ("Hyde Park views", "Rooftop bar", "Couples")
- "Retail: £359" struck-through price
- "2% off" / "11% off" green badge
- "Best Value" gold overlay badge
- "Book now" button (replaced with "View details →" text link)
- "Member rate / night" label

### Why remove the discount display?

When the saving is 2% (£6 on £359), showing it actively hurts credibility. "You saved £6" on a luxury hotel reads as petty, not premium. When the saving is 11% (£25 on £223), it's meaningful but still shouldn't be the primary signal.

**Instead**: show the member price confidently. On the detail/booking modal, show a comparison: "£198 member rate vs £223 on Booking.com — you save £25." This is the right moment for the comparison — when the user has already engaged and is evaluating the booking. Not on the browse card where it competes with photography.

---

## Page Layout Changes

### Hero
**Current**: Dark navy background, centred text, search bar with box-shadow.
**Proposed**: Keep the search bar but simplify. Remove the eyebrow text ("5-STAR HOTELS · MEMBERS SAVE 10–30%"). Make the headline more confident and less promotional.

```
Current:  "5-STAR HOTELS · MEMBERS SAVE 10–30%"
          "Exclusive member rates on luxury hotels"

Better:   "Member rates on London, Dubai and Bangkok's finest hotels"
          (one line, no eyebrow, no percentage claims)
```

### Member Banner
**Current**: Gold-background "Member rates unlocked. You're seeing exclusive below-retail member pricing." with green "Active" badge.
**Remove entirely.** The user already signed up. They know. This is a remnant of the sales funnel, not useful information post-conversion.

### Trust Strip
**Current**: White box with 4 checkmark bullets.
**Remove from main content flow.** If you want to keep trust signals, integrate them into the footer or the "How it works" section. They shouldn't interrupt the path between search and hotel cards.

### Filter Chips
**Current**: "All / Pool / Spa / Views" pill buttons.
**Consider removing.** With only 6 hotels per city, filtering is unnecessary overhead. If kept, style as subtle text links, not pill buttons.

---

## Navigation

### Current
```
[LuxStay]                                [✓ Member] [How it works]
```
(Sticky, dark navy, system font, gold logo)

### Proposed
```
[LuxStay]                    [London  Dubai  Bangkok]  [How it works]
```

Changes:
- Add destination quick-links in nav (replaces the dropdown in search bar for city switching)
- Remove "✓ Member" indicator from nav (they know they're a member)
- Keep sticky, keep navy, but add 4px more vertical padding for breathing room
- Logo in the chosen typeface at weight 600, letter-spacing +0.5px

---

## Mobile Considerations

The current site is responsive but the horizontal card layout breaks poorly on mobile (180px image gets very small). The vertical card layout proposed above is inherently mobile-friendly — image stacks on top, text below, full width. This is one of those rare cases where the mobile-first design is also the better desktop design.

---

## Implementation Priority

If doing this incrementally:

1. **Typography + colour** — swap to chosen font, adjust colour variables. Highest impact per line of CSS changed.
2. **Hotel card layout** — vertical cards with larger images. Transforms the feel of the page.
3. **Remove noise** — strip member banner, trust strip, discount badges, filter chips. Each removal makes the page feel more premium.
4. **Hero simplification** — calmer headline, remove eyebrow.
5. **Photography** — upgrade hotel images. Requires LiteAPI data or manual curation. Highest effort but highest payoff.

---

## Reference Sites

- [Aman Hotels](https://www.aman.com) — the gold standard for aspirational restraint
- [Mr & Mrs Smith](https://www.mrandmrssmith.com) — editorial + booking hybrid
- [Design Hotels](https://www.designhotels.com) — gallery-forward curation
- [Secret Escapes](https://www.secretescapes.com) — closest business model; design to move *away* from

## Design Influences

- **Dieter Rams** — "Less, but better." Every element justifies its existence.
- **Kenya Hara / Muji** — Emptiness as invitation. White space is the luxury.
- **Swiss Typographic Style** — Grid discipline, mathematical spacing, typographic hierarchy.
- **Massimo Vignelli** — One typeface, weight and size variation only, disciplined grid.
- **Erik Spiekermann** — Screen typography: proper letter-spacing, weight hierarchy without colour.
- **Quiet luxury movement (2024–26)** — No logos, no urgency, subtle CTAs, cinematic photography.
