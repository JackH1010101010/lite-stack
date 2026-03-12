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

// ── HTML page builder (shared for city + region pages) ────────
function buildPageHtml(cfg, opts, hotels, siteUrl) {
  const { slug, metaTitle, metaDesc, h1, heroSub, editorial, ctaCity } = opts;
  const primary   = cfg.COLOR_PRIMARY;
  const accent    = cfg.COLOR_ACCENT;
  const brand     = cfg.BRAND_NAME;
  const schemaJSON = buildHotelSchema(hotels, siteUrl, slug);

  const hotelCards = hotels.map(h => `
    <div style="background:#fff;border:1px solid #e5e3de;border-radius:8px;padding:16px 20px;margin-bottom:12px">
      <div style="font-size:17px;font-weight:700;color:${primary};margin-bottom:4px">${h.emoji || '🏨'} ${h.name}</div>
      <div style="font-size:13px;color:#6b6b6b;margin-bottom:6px">📍 ${h.area} · ${h.dist}</div>
      <div style="font-size:13px;color:#6b6b6b;line-height:1.5;margin-bottom:8px">${h.desc}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${(h.tags||[]).map(t => `<span style="font-size:11px;padding:3px 8px;border-radius:3px;background:#f7f7f5;border:1px solid #e5e3de;color:#6b6b6b">${t}</span>`).join('')}</div>
    </div>`).join('');

  const breadcrumbLabel = opts.breadcrumb || h1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}" />
  <link rel="canonical" href="${siteUrl}/${slug}.html" />
  <script type="application/ld+json">${schemaJSON}</script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f7f5;color:#1a1a1a;line-height:1.5}
    nav{background:${primary};padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-size:20px;font-weight:700;color:${accent};letter-spacing:.04em;text-decoration:none}
    .main{max-width:860px;margin:0 auto;padding:32px 16px 64px}
    h1{font-size:clamp(22px,4vw,34px);font-weight:700;color:${primary};line-height:1.2;margin-bottom:12px}
    .hero-sub{font-size:16px;color:#6b6b6b;margin-bottom:32px;line-height:1.6}
    h2{font-size:20px;font-weight:700;color:${primary};margin:32px 0 16px}
    .editorial{background:#fff;border:1px solid #e5e3de;border-radius:6px;padding:24px;margin-bottom:32px}
    .editorial p{font-size:14px;color:#6b6b6b;line-height:1.7;margin-bottom:12px}
    .editorial p:last-child{margin-bottom:0}
    .cta-box{background:${primary};border-radius:8px;padding:32px;text-align:center;margin:32px 0}
    .cta-box h3{color:#fff;font-size:20px;font-weight:700;margin-bottom:8px}
    .cta-box p{color:rgba(255,255,255,.7);font-size:14px;margin-bottom:20px}
    .btn-cta{background:${accent};color:${primary};font-size:15px;font-weight:700;padding:13px 28px;border-radius:6px;text-decoration:none;display:inline-block}
    footer{background:${primary};color:rgba(255,255,255,.5);text-align:center;padding:24px;font-size:13px}
    .breadcrumb{font-size:13px;color:#6b6b6b;margin-bottom:20px}
    .breadcrumb a{color:${primary};text-decoration:none}
  </style>
</head>
<body>

<nav>
  <a href="/" class="logo">${brand}</a>
  <a href="/" style="color:rgba(255,255,255,.7);font-size:13px;text-decoration:none">← All destinations</a>
</nav>

<main class="main">

  <p class="breadcrumb"><a href="/">Home</a> › ${breadcrumbLabel}</p>

  <h1>${h1}</h1>
  <p class="hero-sub">${heroSub}</p>

  <div class="editorial">
    ${editorial}
  </div>

  <h2>${hotels.length} hotels available on ${brand}</h2>
  ${hotelCards}

  <div class="cta-box">
    <h3>Unlock member rates — it's free</h3>
    <p>Join ${brand} in 10 seconds and see prices 10–30% below Booking.com.</p>
    <a href="/?city=${encodeURIComponent(ctaCity)}" class="btn-cta">See member rates →</a>
  </div>

</main>

<footer>
  <p>© ${new Date().getFullYear()} ${brand} · ${cfg.FOOTER_TAGLINE}</p>
  <p style="margin-top:6px;font-size:11px">Member prices only shown to verified members · Rates sourced live via hotel API</p>
</footer>

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

  const siteUrl  = cfg.SCHEMA_URL || `https://${SITE}.netlify.app`;
  const allPages = [];

  const cityCount   = cfg.cities?.length || 0;
  const regionCount = cfg.seo_regions?.length || 0;
  console.log(`\n📄  Generating SEO pages for ${SITE} (${cityCount} cities + ${regionCount} regions)\n`);

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
