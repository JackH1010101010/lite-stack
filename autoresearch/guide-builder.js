#!/usr/bin/env node
/**
 * autoresearch/guide-builder.js — Comparison Guide Generator
 *
 * Generates data-driven comparison guides — the highest-differentiation
 * content type in the system (84-85% unique vs 5-27% for SEO pages).
 *
 * Each guide follows the proven template:
 *   1. AI-citation-optimised summary (first 200 words)
 *   2. Structured comparison table
 *   3. Deep editorial per location/option
 *   4. Hotel picks with quality scores and member pricing
 *   5. Price analysis with proprietary CUG data
 *   6. Verdict with decision framework
 *   7. FAQ (5 questions, AI Overview targets)
 *   8. Methodology disclosure
 *
 * Usage:
 *   node autoresearch/guide-builder.js --guide dubai-downtown-vs-jbr
 *   node autoresearch/guide-builder.js --guide all            (build all pending guides)
 *   node autoresearch/guide-builder.js --list                 (show available guides)
 *
 * Guide definitions live in autoresearch/workflows/guides.json
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const SITES_DIR  = path.join(ROOT, 'sites');
const GUIDES_DIR = path.join(SITES_DIR, 'luxstay', 'guides');
const GUIDE_DEFS = path.join(__dirname, 'workflows', 'guides.json');
const RATE_SNAPSHOT = path.join(__dirname, 'rate-snapshot.json');
const HISTORY_FILE  = path.join(__dirname, 'history.json');

const args   = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const GUIDE  = getArg('--guide', null);

function readJSON(fp, fb) { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fb; } }
function writeJSON(fp, d) { fs.writeFileSync(fp, JSON.stringify(d, null, 2) + '\n', 'utf8'); }

// ── Guide template builder ───────────────────────────────────
function buildGuide(def) {
  const { id, title, h1, metaDesc, brand, siteUrl, date, readTime } = def;
  const { summary, comparisonTable, sectionA, sectionB, priceAnalysis, verdict, faqs, methodology, relatedGuides } = def.content;

  const hotelSchemaItems = [...(sectionA.hotels || []), ...(sectionB.hotels || [])].map((h, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Hotel',
      name: h.name,
      description: h.desc || '',
      address: { '@type': 'PostalAddress', addressLocality: h.area },
      starRating: { '@type': 'Rating', ratingValue: h.stars || '5' },
      offers: { '@type': 'AggregateOffer', lowPrice: h.price, priceCurrency: 'GBP', availability: 'https://schema.org/InStock' }
    }
  }));

  const hotelSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: metaDesc,
    numberOfItems: String(hotelSchemaItems.length),
    itemListElement: hotelSchemaItems
  });

  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  });

  const breadcrumbSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: brand, item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${siteUrl}/guides/` },
      { '@type': 'ListItem', position: 3, name: title.split(':')[0] }
    ]
  });

  const compRows = comparisonTable.rows.map(r =>
    `      <tr>
        <td>${r.category}</td>
        <td>${r.a}</td>
        <td>${r.b}</td>
      </tr>`
  ).join('\n');

  function buildHotelCards(hotels, ctaCity) {
    return hotels.map(h => `
    <div class="pick-card">
      <div class="pick-name">${h.name}</div>
      <div class="pick-stars">${'★'.repeat(parseInt(h.stars) || 5)}</div>
      <div class="pick-score">Quality: <strong>${h.score}/10</strong> (${h.scoreLabel || 'Very Good'})</div>
      <div class="pick-price">From £${h.price}/night (member rate)</div>
      <div class="pick-tags">${(h.tags || []).map(t => `<span class="pick-tag">${t}</span>`).join('')}</div>
      <a href="${siteUrl}/?city=${encodeURIComponent(ctaCity)}" class="btn-rates" data-editorial-cta>See member rates</a>
    </div>`).join('');
  }

  const faqHtml = faqs.map((f, i) => `
    <div class="faq-item${i === 0 ? ' open' : ''}">
      <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        ${f.q} <span class="chevron">▼</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>`).join('');

  const relatedHtml = (relatedGuides || []).map(r =>
    `<a href="${siteUrl}/guides/${r.slug}/" class="related-link">${r.label}</a>`
  ).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${metaDesc}" />
  <link rel="canonical" href="${siteUrl}/guides/${id}/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:url" content="${siteUrl}/guides/${id}/" />
  <meta property="og:image" content="${siteUrl}/og-image.jpg" />
  <meta property="og:site_name" content="${brand}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${metaDesc}" />
  <link rel="dns-prefetch" href="https://api.liteapi.travel" />
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <script type="application/ld+json">${faqSchema}</script>
  <script type="application/ld+json">${hotelSchema}</script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--navy:#1a2744;--gold:#c9a84c;--gold-lt:#f5e9c8;--grey-bg:#f7f7f5;--grey-mid:#e5e3de;--grey-text:#6b6b6b;--black:#1a1a1a;--white:#fff;--green:#1a7a3c;--green-lt:#e8f5ee}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:var(--grey-bg);color:var(--black);line-height:1.7}
    nav{background:var(--navy);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
    .logo{font-size:20px;font-weight:700;color:var(--gold);letter-spacing:.04em;text-decoration:none}
    .nav-right{display:flex;align-items:center;gap:16px}
    .nav-link{color:rgba(255,255,255,.7);font-size:14px;text-decoration:none}.nav-link:hover{color:#fff}
    .breadcrumb{max-width:800px;margin:16px auto 0;padding:0 20px;font-size:13px;color:var(--grey-text)}
    .breadcrumb a{color:var(--grey-text);text-decoration:none}.breadcrumb a:hover{color:var(--navy);text-decoration:underline}
    .breadcrumb span{margin:0 6px}
    article{max-width:800px;margin:0 auto;padding:0 20px 64px}
    .guide-hero{padding:32px 0 24px}
    .guide-hero h1{font-size:clamp(24px,4vw,36px);font-weight:800;color:var(--navy);line-height:1.2;margin-bottom:12px}
    .guide-meta{font-size:14px;color:var(--grey-text);margin-bottom:8px}
    .summary{font-size:16px;line-height:1.8;color:#333;padding:24px 0;border-bottom:1px solid var(--grey-mid)}
    .summary p{margin-bottom:16px}.summary p:last-child{margin-bottom:0}
    h2{font-size:22px;font-weight:700;color:var(--navy);margin:36px 0 16px;line-height:1.3}
    h3{font-size:17px;font-weight:600;color:var(--navy);margin:24px 0 12px}
    p{margin-bottom:16px;font-size:15px;line-height:1.8}
    ul,ol{margin:0 0 16px 24px;font-size:15px;line-height:1.8}li{margin-bottom:6px}
    .comparison-table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px}
    .comparison-table th{background:var(--navy);color:#fff;padding:12px 16px;text-align:left;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
    .comparison-table td{padding:12px 16px;border-bottom:1px solid var(--grey-mid);vertical-align:top}
    .comparison-table tr:nth-child(even){background:#fafaf8}
    .comparison-table .score{display:inline-block;background:var(--gold-lt);color:var(--navy);padding:2px 8px;border-radius:3px;font-weight:600;font-size:13px}
    .comparison-table .price-range{font-weight:600;color:var(--green)}
    .hotel-picks{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin:20px 0}
    .pick-card{background:#fff;border:1px solid var(--grey-mid);border-radius:8px;padding:20px;transition:box-shadow .15s}
    .pick-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1)}
    .pick-name{font-size:16px;font-weight:700;color:var(--navy);margin-bottom:4px}
    .pick-stars{font-size:12px;color:var(--gold);margin-bottom:8px}
    .pick-score{font-size:13px;color:var(--grey-text);margin-bottom:8px}.pick-score strong{color:var(--navy)}
    .pick-price{font-size:14px;font-weight:600;color:var(--green);margin-bottom:12px}
    .pick-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}
    .pick-tag{font-size:11px;padding:2px 8px;border-radius:3px;background:var(--grey-bg);border:1px solid var(--grey-mid);color:var(--grey-text)}
    .btn-rates{display:inline-block;background:var(--navy);color:#fff;font-size:13px;font-weight:600;padding:8px 16px;border-radius:4px;text-decoration:none}.btn-rates:hover{opacity:.88}
    .verdict-box{background:#fff;border:2px solid var(--gold);border-radius:8px;padding:24px;margin:24px 0}
    .verdict-box h3{margin-top:0;color:var(--navy)}
    .verdict-if{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
    .verdict-col h4{font-size:14px;font-weight:700;color:var(--navy);margin-bottom:8px}
    .verdict-col ul{margin:0;padding-left:18px;font-size:14px}.verdict-col li{margin-bottom:4px}
    .faq-section{margin-top:40px}
    .faq-item{background:#fff;border:1px solid var(--grey-mid);border-radius:6px;overflow:hidden;margin-bottom:8px}
    .faq-q{padding:16px 20px;font-size:15px;font-weight:600;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center}
    .faq-q:hover{background:var(--grey-bg)}.chevron{font-size:12px;color:var(--grey-text);transition:transform .2s}
    .faq-a{padding:0 20px 16px;font-size:14px;color:var(--grey-text);line-height:1.7;display:none}
    .faq-item.open .faq-a{display:block}.faq-item.open .chevron{transform:rotate(180deg)}
    .cta-section{background:var(--navy);border-radius:8px;padding:32px;text-align:center;margin:40px 0}
    .cta-section h2{color:var(--gold);margin:0 0 8px}.cta-section p{color:rgba(255,255,255,.7);font-size:15px;margin-bottom:20px}
    .btn-cta{display:inline-block;background:var(--gold);color:var(--navy);font-size:15px;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none}.btn-cta:hover{opacity:.9}
    .methodology{background:#fff;border:1px solid var(--grey-mid);border-radius:6px;padding:20px;margin:24px 0;font-size:13px;color:var(--grey-text);line-height:1.7}
    .methodology h3{font-size:14px;color:var(--navy);margin:0 0 8px}
    .related-guides{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}
    .related-link{font-size:13px;padding:6px 14px;border-radius:4px;background:var(--grey-bg);border:1px solid var(--grey-mid);color:var(--navy);text-decoration:none;font-weight:500}
    .related-link:hover{background:var(--gold-lt);border-color:var(--gold)}
    footer{background:var(--navy);color:rgba(255,255,255,.5);text-align:center;padding:24px;font-size:13px}
    footer a{color:var(--gold);text-decoration:none}footer p+p{margin-top:6px}
    @media(max-width:640px){.verdict-if{grid-template-columns:1fr}.comparison-table{font-size:12px}.comparison-table th,.comparison-table td{padding:8px 10px}}
  </style>
</head>
<body>
<nav>
  <a href="${siteUrl}" class="logo">${brand}</a>
  <div class="nav-right">
    <a href="${siteUrl}/guides/" class="nav-link">Guides</a>
    <a href="${siteUrl}" class="nav-link">Hotels</a>
  </div>
</nav>
<div class="breadcrumb">
  <a href="${siteUrl}">${brand}</a><span>›</span>
  <a href="${siteUrl}/guides/">Guides</a><span>›</span>
  ${title.split(':')[0]}
</div>
<article>
  <div class="guide-hero">
    <h1>${h1}</h1>
    <div class="guide-meta">
      By ${brand} Research · Updated <time datetime="${date}">${formatDate(date)}</time> · ${readTime} min read
    </div>
  </div>

  <div class="summary">
    ${summary.map(p => `<p>${p}</p>`).join('\n    ')}
  </div>

  <h2>${comparisonTable.title}</h2>
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>${comparisonTable.labelA}</th>
        <th>${comparisonTable.labelB}</th>
      </tr>
    </thead>
    <tbody>
${compRows}
    </tbody>
  </table>

  <h2>${sectionA.title}</h2>
  ${sectionA.editorial.map(p => `<p>${p}</p>`).join('\n  ')}
  <h3>Top hotel picks: ${sectionA.label}</h3>
  <div class="hotel-picks">
    ${buildHotelCards(sectionA.hotels, sectionA.ctaCity)}
  </div>

  <h2>${sectionB.title}</h2>
  ${sectionB.editorial.map(p => `<p>${p}</p>`).join('\n  ')}
  <h3>Top hotel picks: ${sectionB.label}</h3>
  <div class="hotel-picks">
    ${buildHotelCards(sectionB.hotels, sectionB.ctaCity)}
  </div>

  <h2>${priceAnalysis.title}</h2>
  ${priceAnalysis.editorial.map(p => `<p>${p}</p>`).join('\n  ')}

  <div class="verdict-box">
    <h3>The verdict</h3>
    <p>${verdict.summary}</p>
    <div class="verdict-if">
      <div class="verdict-col">
        <h4>${verdict.chooseA.label}</h4>
        <ul>${verdict.chooseA.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
      <div class="verdict-col">
        <h4>${verdict.chooseB.label}</h4>
        <ul>${verdict.chooseB.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
    </div>
  </div>

  <div class="cta-section editorial">
    <h2>See exclusive member rates</h2>
    <p>${brand} members save 15-25% on luxury hotels across all destinations.</p>
    <a href="${siteUrl}" class="btn-cta" data-editorial-cta>Browse member rates</a>
  </div>

  <div class="faq-section">
    <h2>Frequently asked questions</h2>
    ${faqHtml}
  </div>

  <div class="methodology">
    <h3>Methodology</h3>
    <p>${methodology}</p>
  </div>

  <h3>Related guides</h3>
  <div class="related-guides">
    ${relatedHtml}
  </div>
</article>

<footer>
  <p>© ${new Date().getFullYear()} ${brand} · <a href="${siteUrl}">Member-only luxury hotel rates</a></p>
  <p>Data sourced from aggregated hotel rates. Prices and availability subject to change.</p>
</footer>

<script>
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
});
function track(e, p) { if (window.posthog && typeof posthog.capture === 'function') posthog.capture(e, p || {}); }
track('page_view', { page: 'guide', guide: '${id}', site: '${brand}' });
document.addEventListener('click', function(e) {
  var t = e.target.closest('[data-editorial-cta], .editorial a, .editorial button');
  if (t) track('editorial_cta_clicked', { cta_text: (t.textContent||'').trim().slice(0,100), cta_href: t.href||'', guide: '${id}' });
});
</script>
</body>
</html>`;
}

function formatDate(d) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const defs = readJSON(GUIDE_DEFS, null);
  if (!defs?.guides) { console.error('No guides.json found'); process.exit(1); }

  if (args.includes('--list')) {
    console.log('\n📚  Available guides:\n');
    for (const [id, g] of Object.entries(defs.guides)) {
      const exists = fs.existsSync(path.join(GUIDES_DIR, id, 'index.html'));
      console.log(`  ${exists ? '✓' : '○'} ${id.padEnd(45)} ${g.title}`);
    }
    return;
  }

  const guidesToBuild = GUIDE === 'all'
    ? Object.keys(defs.guides)
    : [GUIDE];

  for (const guideId of guidesToBuild) {
    const def = defs.guides[guideId];
    if (!def) { console.error(`  ❌ Guide "${guideId}" not found in guides.json`); continue; }

    console.log(`\n📖  Building: ${def.title}...`);
    const html = buildGuide({ id: guideId, ...def });

    const outDir = path.join(GUIDES_DIR, guideId);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    console.log(`  ✓ ${outDir}/index.html (${html.length} bytes)`);
  }

  // Log
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'observation',
    timestamp: new Date().toISOString(),
    observation: `Generated ${guidesToBuild.length} comparison guide(s): ${guidesToBuild.join(', ')}`,
    source: 'guide-builder'
  });
  writeJSON(HISTORY_FILE, history);

  console.log(`\n✅  ${guidesToBuild.length} guide(s) built.\n`);
}

module.exports = { buildGuide };
main().catch(e => { console.error('❌', e.message); process.exit(1); });
