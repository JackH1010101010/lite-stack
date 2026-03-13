# Google Ads Campaign Plan — LuxStay

## Strategy: Capture high-intent hotel searches at the point of booking decision

The goal is to intercept people actively searching for specific luxury hotels and present a lower price via CUG rates. These searchers have already decided on a hotel — they're comparing prices.

---

## Campaign 1: London Hotel Brand Terms

**Campaign type:** Search
**Daily budget:** £15-20
**Bidding:** Manual CPC, start at £0.50-0.80

**Ad Group 1: The Savoy**
- Keywords: "the savoy london price", "the savoy london deals", "savoy hotel london cheap", "the savoy booking"
- Landing page: luxury.lux-stay-members.com (London, Savoy pre-selected if possible)
- Headline 1: The Savoy London — Member Rate
- Headline 2: Save 10-30% vs Booking.com
- Headline 3: Free Membership. No Fees.
- Description: 5-star hotels at below-retail rates. Join free and see member pricing on The Savoy. Same room, same dates, better price.

**Ad Group 2: Shangri-La The Shard**
- Keywords: "shangri-la the shard price", "shangri-la london deals", "shard hotel london booking"
- Same ad structure, swap hotel name

**Ad Group 3: Generic London Luxury**
- Keywords: "luxury hotels london deals", "5 star hotels london cheap", "best hotel prices london", "london hotel member rates"
- Headline 1: London 5-Star Hotels — Member Rates
- Headline 2: 10-30% Below Booking.com
- Description: Member-only rates on London's best hotels. The Savoy, Shangri-La, Royal Lancaster and more. Join free — no booking fees.

---

## Campaign 2: Dubai Hotel Brand Terms

**Daily budget:** £10-15

**Ad Group 1: Hilton Palm Jumeirah**
- Keywords: "hilton palm jumeirah price", "hilton dubai palm deals", "palm jumeirah hotel deals"

**Ad Group 2: Ritz-Carlton Dubai**
- Keywords: "ritz carlton dubai price", "ritz carlton jbr deals"

**Ad Group 3: Generic Dubai Luxury**
- Keywords: "luxury hotels dubai deals", "5 star hotels dubai cheap", "dubai hotel member rates", "palm jumeirah hotel deals"

---

## Campaign 3: Guide Content (Lower CPC, awareness)

**Daily budget:** £5-10
**Bidding:** Manual CPC, £0.20-0.40

**Ad Group 1: Maldives Comparison**
- Keywords: "water villa vs beach villa maldives", "maldives water villa worth it", "maldives villa comparison"
- Landing: /guides/maldives-water-villa-vs-beach-villa/
- Headline: Water Villa vs Beach Villa — 40+ Resorts Compared

**Ad Group 2: Dubai Area Comparison**
- Keywords: "downtown dubai vs jbr", "where to stay dubai", "best area dubai hotel"
- Landing: /guides/dubai-downtown-vs-jbr/

---

## Setup Checklist

1. Create Google Ads account (if not already)
2. Set up conversion tracking:
   - Primary conversion: Modal form submission (sign up)
   - Secondary: Search button click, hotel card click
3. Add Google Ads tag to template.html (new {{GOOGLE_ADS_TAG}} token)
4. Start with Campaign 1, Ad Group 3 (generic London) — broadest audience, test CPC levels
5. Run for 3-5 days at £15/day = £45-75 total test spend
6. If CPA (cost per signup) < £2, scale up
7. If CPA > £5, pause and refine keywords/landing page

## Expected Metrics (Conservative)

- CTR: 3-5% on brand terms, 1-2% on generic
- CPC: £0.40-0.80 average
- Conversion rate (click → signup): 5-10% (modal is low friction)
- £15/day → ~25 clicks → 1-3 signups/day
- First bookings likely within 3-7 days of first signups

## Revenue Math

- Average booking value: £300-500/night × 2 nights = £600-1000
- LuxStay markup: 15%
- Revenue per booking: £90-150
- Need ~1 booking per £90-150 in ad spend to break even
- At 2% booking rate from signups: need ~50 signups per booking
- At £1.50 CPA: £75 ad spend per booking → profitable from day 1

---

## Quick Wins (Do First)

1. **Set up Google Ads account** and link to the site
2. **Start with just 3-5 exact match keywords** for London luxury hotels
3. **£10/day budget** — small enough to not matter, large enough to get data
4. **Track signups as conversions** from the start
5. **Run for 1 week**, then decide whether to scale
