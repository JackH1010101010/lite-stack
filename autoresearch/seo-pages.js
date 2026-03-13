#!/usr/bin/env node
/**
 * autoresearch/seo-pages.js
 *
 * Generates city-level AND region/source-market SEO landing pages for a site config.
 *
 * City pages: /london.html, /dubai.html etc — target "<city> luxury hotels member rates"
 * Region pages: /heathrow-luxury-hotels.html etc — target departure-market / airport keywords
 *               These capture high-intent travellers searching from specific origin markets.
 *
 * Usage:
 *   node autoresearch/seo-pages.js --site maldives-escape
 *   node autoresearch/seo-pages.js --site luxstay
 *
 * Outputs to: sites/<site-name>/<slug>.html  + sitemap.xml + robots.txt
 *
 * Optional env vars:
 *   ANTHROPIC_API_KEY — for AI-generated editorial (falls back to template if unset)
 */

const fs   = require('fs');
const path = require('path');

const CONFIGS_DIR   = path.join(__dirname, '..', 'generator', 'configs');
const SITES_DIR     = path.join(__dirname, '..', 'sites');
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const args   = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i >= 0 && args[i+1] ? args[i+1] : def; };
const SITE   = getArg('--site', null);

if (!SITE) {
  console.error('Usage: node autoresearch/seo-pages.js --site <name>');
  process.exit(1);
}

// ── Claude helper ──────────────────────────────────────────────
async function callClaude(prompt) {
  if (!ANTHROPIC_KEY) return null;
  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content[0].text;
  } catch { return null; }
}

// ── Slug helper ────────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Schema.org ItemList ────────────────────────────────────────
function buildHotelSchema(hotels, siteUrl, slug) {
  const items = hotels.map((h, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Hotel',
      name: h.name,
      description: h.desc,
      address: { '@type': 'PostalAddress', addressLocality: h.area }
    }
  }));
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Hotels on ${siteUrl}/${slug}.html`,
    itemListElement: items
  });
}

// ── Editorial: city page ───────────────────────────────────────
async function getCityEditorial(brand, city, hotels) {
  const hotelNames = hotels.map(h => h.name).join(', ');
  const ai = await callClaude(
    `Write 3 short paragraphs (4-5 sentences each) of SEO-friendly editorial for a luxury hotel booking page targeting the keyword "${city} luxury hotels member rates".
Brand: ${brand}
Hotels: ${hotelNames}
Angle: members save 10-30% vs Booking.com through a closed user group (CUG) platform.
Write naturally, mention specific hotels, include the savings angle, mention rates are live.
Plain HTML <p> tags only — no headings, no markdown.`
  );
  if (ai) return ai;

  const h0 = hotels[0]?.name || 'top hotels';
  const h1 = hotels[1]?.name || h0;
  return `<p>${city} is one of the world's most sought-after luxury travel destinations, home to exceptional properties including ${h0} and ${h1}. ${brand} gives verified members access to these hotels at net rates 10–30% below what Booking.com, Expedia, and Hotels.com publish publicly.</p>
<p>These below-retail rates exist because hotels release unsold inventory through Closed User Group (CUG) channels as check-in approaches. ${brand} is a CUG platform — free to join — that gives you those rates the moment you become a member. Same hotel, same room, same dates: just a materially better price.</p>
<p>Rates on ${brand} are live and updated in real time. The best ${city} member rates typically appear from Wednesday onwards as hotels release unsold rooms ahead of the weekend. Last-minute travellers consistently see the deepest discounts.</p>`;
}

// ── Editorial: region/source-market page ──────────────────────
async function getRegionEditorial(brand, region, hotels) {
  const hotelNames = hotels.map(h => h.name).join(', ');
  const ai = await callClaude(
    `Write 3 short paragraphs (4-5 sentences each) of SEO-friendly editorial for a luxury hotel booking page targeting the keyword "${region.keyword}".
Brand: ${brand}
Hotels available: ${hotelNames}
Positioning angle: ${region.angle}
Key message: members save 10-30% vs Booking.com through a free closed user group platform.
Write naturally, mention specific hotels, mention the origin market (${region.name}), include savings angle, mention live rates.
Plain HTML <p> tags only — no headings, no markdown.`
  );
  if (ai) return ai;

  const h0 = hotels[0]?.name || 'top hotels';
  const h1 = hotels[1]?.name || h0;
  return `<p>${region.angle} ${brand} members consistently access ${h0}, ${h1}, and more at rates 10–30% below any public booking platform. Membership is free and takes under 10 seconds to activate.</p>
<p>These rates exist because luxury hotels release unsold rooms through Closed User Group (CUG) channels — and ${brand} is exactly that. Once you're a member, you see prices that simply aren't available on Booking.com, Expedia, or any other public site.</p>
<p>All rates on ${brand} are live and sourced directly from the hotel inventory API. You're seeing real prices, in real time, updated as availability changes. The closer to check-in, the deeper the typical member discount.</p>`;
}

// ── FAQ schema builder ─────────────────────────────────────────
function buildFaqSchema(faqs) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  });
}

// ── BreadcrumbList schema ──────────────────────────────────────
function buildBreadcrumbSchema(siteUrl, brand, label) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl + '/' },
      { '@type': 'ListItem', position: 2, name: label }
    ]
  });
}

// ── HTML page builder (shared for city + region + amenity pages)
function buildPageHtml(cfg, opts, hotels, siteUrl) {
  const { slug, metaTitle, metaDesc, h1, heroSub, editorial, ctaCity } = opts;
  const primary    = cfg.COLOR_PRIMARY;
  const accent     = cfg.COLOR_ACCENT;
  const accentLt   = cfg.COLOR_ACCENT_LT || '#f5e9c8';
  const brand      = cfg.BRAND_NAME;
  const year       = new Date().getFullYear();
  const breadcrumbLabel = opts.breadcrumb || h1;

  const schemaJSON      = buildHotelSchema(hotels, siteUrl, slug);
  const breadcrumbJSON  = buildBreadcrumbSchema(siteUrl, brand, breadcrumbLabel);

  // ── FAQ: standard set + city-specific ─────────────────────
  const faqs = [
    { q: `Are these ${ctaCity} hotel rates really cheaper than Booking.com?`,
      a: `Yes. ${brand} is a Closed User Group (CUG) platform. Hotels release unsold inventory to CUG channels at net rates — typically 10–30% below the public retail prices shown on Booking.com, Expedia, and Hotels.com. These rates are legally restricted to verified members and cannot be shown on public pages.` },
    { q: `How do I access member rates?`,
      a: `Membership is free and takes under 10 seconds. Click "Join free", sign in with Google, and your member rates unlock immediately — no credit card, no subscription, no minimum stay.` },
    { q: `Are the rates live?`,
      a: `All rates are sourced in real time from the hotel inventory API. You see live availability and pricing, not cached or historical data. Rates update as rooms are booked or released.` },
    { q: `Is there a minimum stay requirement?`,
      a: `No minimum stay. Book one night or ten — member rates apply regardless of trip length.` },
    { q: `When are the best member rates available?`,
      a: `The deepest discounts typically appear from Wednesday onwards as hotels release unsold rooms ahead of the weekend. Last-minute travellers consistently see the largest savings, sometimes 25–35% below public prices.` }
  ];
  const faqSchema = buildFaqSchema(faqs);

  const faqHtml = faqs.map((f, i) => `
    <div class="faq-item reveal" style="--d:${i * 0.06}s">
      <button class="faq-q" aria-expanded="false" onclick="toggleFaq(this)">
        ${f.q}
        <span class="faq-icon">＋</span>
      </button>
      <div class="faq-a" hidden>${f.a}</div>
    </div>`).join('');

  // ── Hotel cards ────────────────────────────────────────────
  const hotelCards = hotels.map((h, i) => {
    const tags = (h.tags || []).slice(0, 5).map(t =>
      `<span class="tag">${t}</span>`).join('');
    return `
    <div class="hotel-card reveal" style="--d:${i * 0.07}s">
      <div class="hotel-img-wrap">
        <div class="hotel-img-bg" style="background:linear-gradient(135deg,${primary}cc,${primary}88)">
          <span class="hotel-emoji">${h.emoji || '🏨'}</span>
        </div>
        <div class="save-badge">Save up to 30%</div>
      </div>
      <div class="hotel-body">
        <div class="hotel-name">${h.name}</div>
        <div class="hotel-loc">📍 ${h.area}${h.dist ? ' · ' + h.dist : ''}</div>
        <div class="hotel-desc">${h.desc}</div>
        <div class="hotel-tags">${tags}</div>
        <a href="/?city=${encodeURIComponent(ctaCity)}" class="hotel-cta">See member rate →</a>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}" />
  <link rel="canonical" href="${siteUrl}/${slug}.html" />
  <!-- Open Graph -->
  <meta property="og:title" content="${metaTitle}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${siteUrl}/${slug}.html" />
  <script type="application/ld+json">${schemaJSON}</script>
  <script type="application/ld+json">${faqSchema}</script>
  <script type="application/ld+json">${breadcrumbJSON}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:${primary};--gold:${accent};--gold-lt:${accentLt};
  --grey-bg:#f7f7f5;--grey-mid:#e5e3de;--grey-text:#6b6b6b;
  --black:#1a1a1a;--white:#fff;--green:#1a7a3c;--green-lt:#e8f5ee;
  --radius:10px;--shadow:0 2px 16px rgba(0,0,0,.09);
}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  background:var(--grey-bg);color:var(--black);line-height:1.55}

/* ── NAV ─────────────────────────────────────────────────── */
nav{background:var(--navy);padding:0 24px;height:58px;display:flex;
  align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;
  box-shadow:0 2px 12px rgba(0,0,0,.25)}
.logo{font-size:20px;font-weight:700;color:var(--gold);letter-spacing:.04em;text-decoration:none}
.nav-cta{background:var(--gold);color:var(--navy);font-size:13px;font-weight:700;
  padding:7px 16px;border-radius:5px;text-decoration:none;white-space:nowrap}
.nav-back{color:rgba(255,255,255,.65);font-size:13px;text-decoration:none}
.nav-back:hover{color:#fff}

/* ── HERO ────────────────────────────────────────────────── */
.hero{background:var(--navy);padding:60px 24px 56px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,168,76,.12),transparent);
  pointer-events:none}
.hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--gold);
  text-transform:uppercase;margin-bottom:14px;opacity:.9}
.hero h1{font-size:clamp(24px,4.5vw,42px);font-weight:800;color:#fff;line-height:1.18;
  max-width:680px;margin:0 auto 18px;letter-spacing:-.02em}
.hero-sub{color:rgba(255,255,255,.62);font-size:16px;max-width:560px;margin:0 auto 36px;line-height:1.65}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn-primary{background:var(--gold);color:var(--navy);font-size:15px;font-weight:700;
  padding:14px 32px;border-radius:6px;text-decoration:none;
  transition:transform .15s,box-shadow .15s;display:inline-block}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,168,76,.4)}
.btn-ghost{background:transparent;color:rgba(255,255,255,.75);font-size:14px;
  padding:14px 24px;border-radius:6px;text-decoration:none;
  border:1px solid rgba(255,255,255,.2);display:inline-block}
.btn-ghost:hover{border-color:rgba(255,255,255,.5);color:#fff}

/* ── TRUST STRIP ─────────────────────────────────────────── */
.trust-strip{background:#fff;border-bottom:1px solid var(--grey-mid);padding:18px 24px;
  display:flex;gap:0;justify-content:center;overflow-x:auto}
.ti{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--grey-text);
  padding:0 20px;border-right:1px solid var(--grey-mid);white-space:nowrap}
.ti:last-child{border-right:none}
.ti-icon{font-size:16px}
.ti strong{color:var(--black)}

/* ── COMPARISON BAR ──────────────────────────────────────── */
.compare-section{max-width:780px;margin:48px auto 0;padding:0 20px}
.compare-title{font-size:19px;font-weight:700;color:var(--navy);text-align:center;margin-bottom:20px}
.compare-table{width:100%;border-collapse:collapse;background:#fff;border-radius:var(--radius);
  overflow:hidden;box-shadow:var(--shadow)}
.compare-table th{background:var(--navy);color:#fff;font-size:12px;font-weight:600;
  text-transform:uppercase;letter-spacing:.07em;padding:12px 16px;text-align:center}
.compare-table th:first-child{text-align:left}
.compare-table td{padding:13px 16px;border-bottom:1px solid var(--grey-mid);font-size:14px;text-align:center}
.compare-table td:first-child{text-align:left;font-weight:600;color:var(--black)}
.compare-table tr:last-child td{border-bottom:none}
.compare-table .hl{background:rgba(201,168,76,.08)}
.check{color:var(--green);font-weight:700}
.cross{color:#b91c1c}

/* ── MAIN CONTENT ────────────────────────────────────────── */
.main{max-width:900px;margin:0 auto;padding:48px 20px 80px}
.section-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:var(--gold);margin-bottom:10px}
.section-title{font-size:22px;font-weight:700;color:var(--navy);margin-bottom:8px}
.section-sub{font-size:15px;color:var(--grey-text);margin-bottom:32px;line-height:1.6}

/* editorial */
.editorial-wrap{background:#fff;border-radius:var(--radius);border:1px solid var(--grey-mid);
  padding:28px 32px;margin-bottom:40px;box-shadow:var(--shadow)}
.editorial-wrap p{font-size:15px;color:#444;line-height:1.75;margin-bottom:14px}
.editorial-wrap p:last-child{margin-bottom:0}

/* hotel cards */
.hotels-grid{display:grid;gap:16px;margin-bottom:48px}
.hotel-card{background:#fff;border-radius:var(--radius);border:1px solid var(--grey-mid);
  display:grid;grid-template-columns:160px 1fr;overflow:hidden;
  box-shadow:var(--shadow);transition:box-shadow .2s,transform .2s}
.hotel-card:hover{box-shadow:0 6px 28px rgba(0,0,0,.13);transform:translateY(-2px)}
.hotel-img-wrap{position:relative}
.hotel-img-bg{width:100%;height:100%;min-height:150px;display:flex;align-items:center;
  justify-content:center;font-size:44px}
.save-badge{position:absolute;top:10px;left:10px;background:var(--gold);color:var(--navy);
  font-size:10px;font-weight:700;padding:4px 8px;border-radius:3px;text-transform:uppercase;
  letter-spacing:.06em}
.hotel-body{padding:16px 20px;display:flex;flex-direction:column;gap:6px}
.hotel-name{font-size:16px;font-weight:700;color:var(--navy);line-height:1.25}
.hotel-loc{font-size:12px;color:var(--grey-text)}
.hotel-desc{font-size:13px;color:#555;line-height:1.55;flex:1}
.hotel-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.tag{font-size:11px;padding:3px 9px;border-radius:20px;background:var(--grey-bg);
  border:1px solid var(--grey-mid);color:var(--grey-text)}
.hotel-cta{display:inline-flex;align-items:center;gap:6px;margin-top:10px;
  background:var(--navy);color:#fff;font-size:12px;font-weight:700;
  padding:8px 14px;border-radius:5px;text-decoration:none;align-self:flex-start;
  transition:background .15s}
.hotel-cta:hover{background:#253259}

/* mid-page CTA band */
.cta-band{background:var(--navy);border-radius:var(--radius);padding:36px 32px;
  text-align:center;margin:48px 0;position:relative;overflow:hidden}
.cta-band::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 70% 80% at 50% 120%,rgba(201,168,76,.15),transparent);
  pointer-events:none}
.cta-band h2{color:#fff;font-size:22px;font-weight:700;margin-bottom:8px}
.cta-band p{color:rgba(255,255,255,.62);font-size:14px;margin-bottom:22px}

/* FAQ */
.faq-wrap{margin-bottom:48px}
.faq-item{background:#fff;border:1px solid var(--grey-mid);border-radius:8px;
  margin-bottom:8px;overflow:hidden}
.faq-q{width:100%;text-align:left;background:none;border:none;padding:16px 20px;
  font-size:15px;font-weight:600;color:var(--navy);cursor:pointer;
  display:flex;justify-content:space-between;align-items:center;gap:12px;line-height:1.4}
.faq-q:hover{background:var(--grey-bg)}
.faq-icon{font-size:18px;color:var(--gold);flex-shrink:0;transition:transform .2s}
.faq-item.open .faq-icon{transform:rotate(45deg)}
.faq-a{padding:0 20px 16px;font-size:14px;color:#555;line-height:1.7}

/* scroll reveal */
.reveal{opacity:0;transform:translateY(24px);transition:opacity .55s var(--d,0s),transform .55s var(--d,0s)}
.reveal.visible{opacity:1;transform:none}

/* sticky bottom CTA (mobile) */
.sticky-cta{position:fixed;bottom:0;left:0;right:0;background:var(--navy);
  padding:12px 20px;display:flex;align-items:center;justify-content:space-between;
  box-shadow:0 -4px 20px rgba(0,0,0,.25);z-index:150;transform:translateY(100%);
  transition:transform .3s}
.sticky-cta.show{transform:none}
.sticky-cta-text{color:rgba(255,255,255,.75);font-size:13px}
.sticky-cta-text strong{color:#fff;display:block;font-size:14px}

/* breadcrumb */
.breadcrumb{font-size:13px;color:var(--grey-text);margin-bottom:28px}
.breadcrumb a{color:var(--navy);text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.breadcrumb span{margin:0 6px;color:var(--grey-mid)}

/* footer */
footer{background:var(--navy);color:rgba(255,255,255,.45);text-align:center;
  padding:32px 24px;font-size:13px;line-height:1.7}
footer a{color:rgba(255,255,255,.55);text-decoration:none}
footer a:hover{color:#fff}
.footer-links{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}

@media(max-width:600px){
  .hero{padding:44px 20px 40px}
  .ti{padding:0 14px;font-size:12px}
  .hotel-card{grid-template-columns:1fr}
  .hotel-img-bg{min-height:110px}
  .cta-band{padding:28px 20px}
  .main{padding:36px 16px 72px}
  .editorial-wrap{padding:20px}
  .compare-section{padding:0 16px}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <a href="/" class="logo">${brand}</a>
  <div style="display:flex;align-items:center;gap:16px">
    <a href="/" class="nav-back">← Hotels</a>
    <a href="/?city=${encodeURIComponent(ctaCity)}" class="nav-cta">See rates</a>
  </div>
</nav>

<!-- HERO -->
<header class="hero">
  <div class="hero-eyebrow">Member Rates · Closed User Group</div>
  <h1>${h1}</h1>
  <p class="hero-sub">${heroSub}</p>
  <div class="hero-btns">
    <a href="/?city=${encodeURIComponent(ctaCity)}" class="btn-primary">See live member rates →</a>
    <a href="#hotels" class="btn-ghost">View ${hotels.length} hotels ↓</a>
  </div>
</header>

<!-- TRUST STRIP -->
<div class="trust-strip">
  <div class="ti"><span class="ti-icon">🔒</span><span>Free membership, instant access</span></div>
  <div class="ti"><span class="ti-icon">💷</span><span><strong>10–30%</strong> below Booking.com</span></div>
  <div class="ti"><span class="ti-icon">⚡</span><span>Live rates — no cached prices</span></div>
  <div class="ti"><span class="ti-icon">📅</span><span>No minimum stay</span></div>
</div>

<!-- COMPARISON TABLE -->
<div class="compare-section reveal">
  <div class="compare-title">How ${brand} compares</div>
  <table class="compare-table">
    <thead>
      <tr>
        <th>Feature</th>
        <th class="hl">${brand} (Members)</th>
        <th>Booking.com</th>
        <th>Expedia</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Net/CUG rates</td><td class="hl check">✓ Yes</td><td class="cross">✗ No</td><td class="cross">✗ No</td></tr>
      <tr><td>Typical saving vs retail</td><td class="hl"><strong>10–30%</strong></td><td>0%</td><td>0–5%</td></tr>
      <tr><td>Membership cost</td><td class="hl"><strong>Free</strong></td><td>Free</td><td>Free</td></tr>
      <tr><td>Live inventory API</td><td class="hl check">✓ Yes</td><td class="check">✓ Yes</td><td class="check">✓ Yes</td></tr>
      <tr><td>No minimum stay</td><td class="hl check">✓ Yes</td><td class="check">✓ Yes</td><td class="check">✓ Yes</td></tr>
    </tbody>
  </table>
</div>

<!-- MAIN -->
<main class="main">

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>›</span>
    <a href="/?city=${encodeURIComponent(ctaCity)}">${ctaCity}</a><span>›</span>
    ${breadcrumbLabel}
  </nav>

  <!-- Editorial -->
  <div class="section-label">About this page</div>
  <div class="editorial-wrap reveal">
    ${editorial}
  </div>

  <!-- Hotels -->
  <div id="hotels">
    <div class="section-label">Available properties</div>
    <div class="section-title">${hotels.length} hotels on ${brand}</div>
    <div class="section-sub">All properties below are bookable at member rates. Click any hotel to see live pricing.</div>
    <div class="hotels-grid">
      ${hotelCards}
    </div>
  </div>

  <!-- Mid-page CTA -->
  <div class="cta-band reveal">
    <h2>Unlock member rates — it's free</h2>
    <p>Join ${brand} in 10 seconds and see prices 10–30% below Booking.com. No credit card. No subscription.</p>
    <a href="/?city=${encodeURIComponent(ctaCity)}" class="btn-primary">Join free and see rates →</a>
  </div>

  <!-- FAQ -->
  <div class="faq-wrap">
    <div class="section-label">Frequently asked</div>
    <div class="section-title">Common questions</div>
    <div style="height:20px"></div>
    ${faqHtml}
  </div>

</main>

<!-- FOOTER -->
<footer>
  <div class="footer-links">
    <a href="/">Home</a>
    <a href="/?city=${encodeURIComponent(ctaCity)}">Browse ${ctaCity} hotels</a>
    <a href="/partners.html">Partner programme</a>
  </div>
  <p>© ${year} ${brand} · ${cfg.FOOTER_TAGLINE}</p>
  <p style="margin-top:6px;font-size:11px;opacity:.6">Member prices visible to verified members only · Rates sourced live via hotel API · Not affiliated with Booking.com</p>
</footer>

<!-- STICKY BOTTOM CTA (appears after scroll) -->
<div class="sticky-cta" id="sticky-cta">
  <div class="sticky-cta-text">
    <strong>See ${ctaCity} member rates</strong>
    Save 10–30% vs Booking.com
  </div>
  <a href="/?city=${encodeURIComponent(ctaCity)}" class="btn-primary" style="font-size:13px;padding:10px 20px">Join free →</a>
</div>

<script>
// ── Scroll reveal ───────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Sticky CTA (show after 60% scroll depth) ───────────────
const stickyCta = document.getElementById('sticky-cta');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  stickyCta.classList.toggle('show', scrolled > 0.3);
}, { passive: true });

// ── FAQ accordion ───────────────────────────────────────────
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const ans  = item.querySelector('.faq-a');
  const open = item.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  open ? ans.removeAttribute('hidden') : ans.setAttribute('hidden', '');
}
</script>

</body>
</html>`;
}

// ── Build a city page ──────────────────────────────────────────
async function buildCityPage(cfg, city, hotels, siteUrl) {
  const slug      = toSlug(city);
  const brand     = cfg.BRAND_NAME;
  const editorial = await getCityEditorial(brand, city, hotels);
  return buildPageHtml(cfg, {
    slug,
    metaTitle: `${city} Luxury Hotels — Member Rates | ${brand}`,
    metaDesc:  `Save 10–30% on ${city} luxury hotels with ${brand} member pricing. ${hotels.slice(0,3).map(h=>h.name).join(', ')} and more. Live rates, no minimum stay.`,
    h1:        `${city} Luxury Hotel Member Rates`,
    heroSub:   `Save 10–30% on ${city}'s finest hotels with ${brand} member pricing. Live rates, no minimum stay. ${hotels.length} hotels available.`,
    editorial,
    ctaCity:   city,
    breadcrumb: city
  }, hotels, siteUrl);
}

// ── Build a region/source-market page ─────────────────────────
async function buildRegionPage(cfg, region, hotels, siteUrl) {
  const brand     = cfg.BRAND_NAME;
  const editorial = await getRegionEditorial(brand, region, hotels);
  return buildPageHtml(cfg, {
    slug:      region.slug,
    metaTitle: `${region.name} — Luxury Hotel Member Rates | ${brand}`,
    metaDesc:  `${region.angle} Save 10–30% on ${hotels.slice(0,3).map(h=>h.name).join(', ')} with ${brand} member pricing. Live rates.`,
    h1:        `${region.name} — Luxury Hotel Member Rates`,
    heroSub:   `${region.angle} ${hotels.length} hotels available at member-only pricing. Live rates, no minimum stay.`,
    editorial,
    ctaCity:   region.city,
    breadcrumb: region.name
  }, hotels, siteUrl);
}

// ── Editorial: amenity page ────────────────────────────────────
async function getAmenityEditorial(brand, city, amenity, hotels) {
  const hotelNames = hotels.map(h => h.name).join(', ');
  const keyword = `${city} hotel with ${amenity} member rates`;
  const ai = await callClaude(
    `Write 3 short paragraphs (4-5 sentences each) of SEO-friendly editorial for a luxury hotel booking page targeting the keyword "${keyword}".
Brand: ${brand}
Hotels: ${hotelNames}
Focus: guests looking specifically for a ${amenity} at a luxury ${city} hotel. Position the member rate angle (10-30% below Booking.com) with the ${amenity} as the deciding filter.
Plain HTML <p> tags only — no headings, no markdown.`
  );
  if (ai) return ai;

  const h0 = hotels[0]?.name || 'top hotels';
  return `<p>Finding a luxury ${city} hotel with ${amenity} at a fair price is harder than it sounds. The properties with the best ${amenity} tend to command the highest rack rates. ${brand} members access these same hotels — including ${h0} — at prices 10–30% below what Booking.com, Expedia and Hotels.com publicly advertise.</p>
<p>These below-retail rates come through ${brand}'s Closed User Group (CUG) channel, which gives free members access to hotel inventory released at net rates. The ${amenity} you're looking for doesn't disappear — you just pay significantly less to enjoy it.</p>
<p>All rates on ${brand} update in real time from the hotel API. Rates are typically sharpest on Wednesday through Friday as hotels release unsold rooms ahead of the weekend — especially for rooms with premium amenities like ${amenity}.</p>`;
}

// ── Build an amenity combination page ─────────────────────────
async function buildAmenityPage(cfg, amenityDef, siteUrl) {
  const { slug, city, amenity, displayName } = amenityDef;
  const hotels  = (cfg.hotels?.[city] || []).filter(h =>
    h.tags?.some(t => t.toLowerCase().includes(amenity.toLowerCase())) ||
    h.desc?.toLowerCase().includes(amenity.toLowerCase())
  );
  // Fall back to all city hotels if filter is too aggressive
  const useHotels = hotels.length >= 2 ? hotels : (cfg.hotels?.[city] || []);
  if (!useHotels.length) return null;

  const brand     = cfg.BRAND_NAME;
  const editorial = await getAmenityEditorial(brand, city, amenity, useHotels);
  const name      = displayName || `${city} Hotels with ${amenity.charAt(0).toUpperCase() + amenity.slice(1)}`;

  return buildPageHtml(cfg, {
    slug,
    metaTitle: `${name} — Member Rates | ${brand}`,
    metaDesc:  `${city} luxury hotels with ${amenity} at member-only rates. Save 10–30% on ${useHotels.slice(0,3).map(h=>h.name).join(', ')}. Live rates, no minimum stay.`,
    h1:        `${name} — Member Rates`,
    heroSub:   `${useHotels.length} ${city} luxury hotels with ${amenity} available at ${brand} member pricing. Save 10–30% vs Booking.com. Live rates.`,
    editorial,
    ctaCity:   city,
    breadcrumb: name
  }, useHotels, siteUrl);
}

// ── Build sitemap ──────────────────────────────────────────────
function buildSitemap(siteUrl, pages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`,
    ...pages.map(p => `  <url><loc>${siteUrl}/${p}</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>`)
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const cfgPath = path.join(CONFIGS_DIR, `${SITE}.json`);
  if (!fs.existsSync(cfgPath)) { console.error(`Config not found: ${cfgPath}`); process.exit(1); }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

  const outDir = path.join(SITES_DIR, SITE);
  fs.mkdirSync(outDir, { recursive: true });

  const siteUrl  = cfg.SCHEMA_URL || cfg.SITE_URL || `https://${SITE}.workers.dev`;
  const allPages = [];

  const cityCount    = cfg.cities?.length || 0;
  const regionCount  = cfg.seo_regions?.length || 0;
  const amenityCount = cfg.seo_amenity_pages?.length || 0;
  console.log(`\n📄  Generating SEO pages for ${SITE} (${cityCount} cities + ${regionCount} regions + ${amenityCount} amenity pages)\n`);

  // ── City pages ─────────────────────────────────────────────
  for (const cityObj of (cfg.cities || [])) {
    const city   = cityObj.value;
    const hotels = cfg.hotels?.[city] || [];
    if (!hotels.length) { console.log(`  ⏭  ${city} — no hotels, skipping`); continue; }

    console.log(`  [city]   ${city} (${hotels.length} hotels)...`);
    const html     = await buildCityPage(cfg, city, hotels, siteUrl);
    const filename = `${toSlug(city)}.html`;
    fs.writeFileSync(path.join(outDir, filename), html, 'utf8');
    allPages.push(filename);
    console.log(`  ✓ ${filename}`);
  }

  // ── Region / source-market pages ───────────────────────────
  for (const region of (cfg.seo_regions || [])) {
    const city   = region.city;
    const hotels = cfg.hotels?.[city] || [];
    if (!hotels.length) { console.log(`  ⏭  region ${region.slug} — no hotels for "${city}", skipping`); continue; }

    console.log(`  [region] ${region.name} → ${city} (${hotels.length} hotels)...`);
    const html     = await buildRegionPage(cfg, region, hotels, siteUrl);
    const filename = `${region.slug}.html`;
    fs.writeFileSync(path.join(outDir, filename), html, 'utf8');
    allPages.push(filename);
    console.log(`  ✓ ${filename}`);
  }

  // ── Amenity pages ──────────────────────────────────────────
  for (const amenityDef of (cfg.seo_amenity_pages || [])) {
    const city = amenityDef.city;
    const available = cfg.hotels?.[city] || [];
    if (!available.length) { console.log(`  ⏭  amenity ${amenityDef.slug} — no hotels for "${city}", skipping`); continue; }

    console.log(`  [amenity] ${amenityDef.displayName || amenityDef.slug} → ${city}...`);
    const html = await buildAmenityPage(cfg, amenityDef, siteUrl);
    if (!html) { console.log(`  ⏭  ${amenityDef.slug} — skipped (buildAmenityPage returned null)`); continue; }
    const filename = `${amenityDef.slug}.html`;
    fs.writeFileSync(path.join(outDir, filename), html, 'utf8');
    allPages.push(filename);
    console.log(`  ✓ ${filename}`);
  }

  // ── Sitemap ────────────────────────────────────────────────
  const sitemap = buildSitemap(siteUrl, allPages);
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`\n  ✓ sitemap.xml (${allPages.length + 1} URLs)`);

  // ── robots.txt ─────────────────────────────────────────────
  const robots = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
  fs.writeFileSync(path.join(outDir, 'robots.txt'), robots, 'utf8');
  console.log(`  ✓ robots.txt`);

  console.log(`\n✅  Done. ${allPages.length} SEO pages + sitemap + robots.txt`);
  console.log(`\n   Pages live at:`);
  allPages.forEach(p => console.log(`     ${siteUrl}/${p}`));
  console.log('');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
