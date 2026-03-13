#!/usr/bin/env node
/**
 * Comparison Guide Generator
 * Usage: node generate-guide.js <slug>
 *
 * Reads generator/configs/comparison-guides/<slug>.json
 * Outputs sites/luxstay/guides/<slug>/index.html
 *
 * The guide config JSON contains all content + data needed to populate
 * the comparison-guide.html template.
 */

const fs   = require('fs');
const path = require('path');

// ── Args ──────────────────────────────────────────────────────
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node generate-guide.js <slug>');
  console.error('  e.g. node generate-guide.js dubai-marina-vs-palm-jumeirah');
  process.exit(1);
}

// ── Load config ───────────────────────────────────────────────
const configPath = path.join(__dirname, 'configs', 'comparison-guides', `${slug}.json`);
if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ── Load template ─────────────────────────────────────────────
const templatePath = path.join(__dirname, 'templates', 'comparison-guide.html');
if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  process.exit(1);
}
let html = fs.readFileSync(templatePath, 'utf8');

// ── Build derived HTML from structured config ─────────────────

// SLUG
cfg.SLUG = slug;

// SITE_URL default
if (!cfg.SITE_URL) cfg.SITE_URL = 'https://luxury.lux-stay-members.com';

// CANONICAL_URL
if (!cfg.CANONICAL_URL) cfg.CANONICAL_URL = `${cfg.SITE_URL}/guides/${slug}/`;

// OG_IMAGE fallback
if (!cfg.OG_IMAGE) cfg.OG_IMAGE = `${cfg.SITE_URL}/og-image.jpg`;

// FOOTER_YEAR
if (!cfg.FOOTER_YEAR) cfg.FOOTER_YEAR = new Date().getFullYear().toString();

// PUBLISH_DATE_DISPLAY from PUBLISH_DATE
if (cfg.PUBLISH_DATE && !cfg.PUBLISH_DATE_DISPLAY) {
  const d = new Date(cfg.PUBLISH_DATE);
  cfg.PUBLISH_DATE_DISPLAY = d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// READ_TIME estimate (words / 200)
if (!cfg.READ_TIME) {
  const allText = JSON.stringify(cfg);
  const wordCount = allText.split(/\s+/).length;
  cfg.READ_TIME = String(Math.max(5, Math.ceil(wordCount / 200)));
}

// SUMMARY_HTML from summary paragraphs
if (cfg.summary && Array.isArray(cfg.summary)) {
  cfg.SUMMARY_HTML = cfg.summary.map(p => `    <p>${p}</p>`).join('\n');
} else if (cfg.summary && typeof cfg.summary === 'string') {
  cfg.SUMMARY_HTML = `    <p>${cfg.summary}</p>`;
}

// COMPARISON_TABLE_ROWS from comparison_table
if (cfg.comparison_table && Array.isArray(cfg.comparison_table)) {
  cfg.COMPARISON_TABLE_ROWS = cfg.comparison_table.map(row => {
    return `      <tr>
        <td>${row.category}</td>
        <td>${row.location_a}</td>
        <td>${row.location_b}</td>
      </tr>`;
  }).join('\n');
}

// LOCATION content sections
if (cfg.location_a_content && Array.isArray(cfg.location_a_content)) {
  cfg.LOCATION_A_CONTENT = cfg.location_a_content.map(p => `  <p>${p}</p>`).join('\n');
}
if (cfg.location_b_content && Array.isArray(cfg.location_b_content)) {
  cfg.LOCATION_B_CONTENT = cfg.location_b_content.map(p => `  <p>${p}</p>`).join('\n');
}

// HOTEL CARDS — builds mini pick-card HTML for each side
function buildHotelCards(hotels) {
  if (!hotels || !Array.isArray(hotels)) return '';
  return hotels.map(h => {
    const stars = '★'.repeat(h.stars || 5);
    const tags = (h.tags || []).map(t => `<span class="pick-tag">${t}</span>`).join('');
    const scoreLabel = h.quality_score >= 9 ? 'Exceptional'
      : h.quality_score >= 8 ? 'Outstanding'
      : h.quality_score >= 7 ? 'Very Good' : 'Good';
    return `    <div class="pick-card">
      <div class="pick-name">${h.name}</div>
      <div class="pick-stars">${stars}</div>
      <div class="pick-score">Quality: <strong>${h.quality_score || '—'}/10</strong> (${scoreLabel})</div>
      ${h.price_from ? `<div class="pick-price">From £${h.price_from}/night (member rate)</div>` : ''}
      ${tags ? `<div class="pick-tags">${tags}</div>` : ''}
      <a href="${cfg.SITE_URL}/?city=${encodeURIComponent(h.area || h.city || '')}" class="btn-rates" data-editorial-cta>See member rates</a>
    </div>`;
  }).join('\n');
}
cfg.HOTELS_A_CARDS = buildHotelCards(cfg.hotels_a);
cfg.HOTELS_B_CARDS = buildHotelCards(cfg.hotels_b);

// PRICE_ANALYSIS_HTML
if (cfg.price_analysis && Array.isArray(cfg.price_analysis)) {
  cfg.PRICE_ANALYSIS_HTML = cfg.price_analysis.map(p => `  <p>${p}</p>`).join('\n');
} else if (cfg.price_analysis && typeof cfg.price_analysis === 'string') {
  cfg.PRICE_ANALYSIS_HTML = `  <p>${cfg.price_analysis}</p>`;
}

// VERDICT_HTML from verdict object
if (cfg.verdict) {
  const aItems = (cfg.verdict.choose_a_reasons || []).map(r => `<li>${r}</li>`).join('\n          ');
  const bItems = (cfg.verdict.choose_b_reasons || []).map(r => `<li>${r}</li>`).join('\n          ');
  cfg.VERDICT_HTML = `    <p>${cfg.verdict.summary || ''}</p>
    <div class="verdict-if">
      <div class="verdict-col">
        <h4>Choose ${cfg.LOCATION_A} if you want:</h4>
        <ul>
          ${aItems}
        </ul>
      </div>
      <div class="verdict-col">
        <h4>Choose ${cfg.LOCATION_B} if you want:</h4>
        <ul>
          ${bItems}
        </ul>
      </div>
    </div>`;
}

// FAQ_HTML + FAQ_SCHEMA_ITEMS from faq_items
if (cfg.faq_items && Array.isArray(cfg.faq_items)) {
  cfg.FAQ_HTML = cfg.faq_items.map((f, i) => {
    const open = i === 0 ? ' open' : '';
    return `    <div class="faq-item${open}">
      <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        ${f.q} <span class="chevron">▼</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>`;
  }).join('\n');

  cfg.FAQ_SCHEMA_ITEMS = cfg.faq_items.map(f => JSON.stringify({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": { "@type": "Answer", "text": f.a }
  })).join(',');
}

// HOTEL_SCHEMA_ITEMS + HOTEL_COUNT from both hotel arrays
const allHotels = [...(cfg.hotels_a || []), ...(cfg.hotels_b || [])];
cfg.HOTEL_COUNT = String(allHotels.length);
cfg.HOTEL_SCHEMA_ITEMS = allHotels.map((h, i) => JSON.stringify({
  "@type": "ListItem",
  "position": i + 1,
  "item": {
    "@type": "Hotel",
    "name": h.name,
    "description": h.description || '',
    "address": { "@type": "PostalAddress", "addressLocality": h.area || h.city || '' },
    "starRating": { "@type": "Rating", "ratingValue": String(h.stars || 5) },
    ...(h.price_from ? {
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": String(h.price_from),
        "priceCurrency": "GBP",
        "availability": "https://schema.org/InStock"
      }
    } : {})
  }
})).join(',');

// RELATED_LINKS_HTML from related_guides
if (cfg.related_guides && Array.isArray(cfg.related_guides)) {
  cfg.RELATED_LINKS_HTML = cfg.related_guides.map(r =>
    `    <a href="${cfg.SITE_URL}/guides/${r.slug}/" class="related-link">${r.title}</a>`
  ).join('\n');
} else {
  cfg.RELATED_LINKS_HTML = '';
}

// METHODOLOGY_TEXT default
if (!cfg.METHODOLOGY_TEXT) {
  cfg.METHODOLOGY_TEXT = `This guide is based on aggregated data from ${allHotels.length} hotels sourced via LiteAPI. Quality scores are computed from star ratings, guest review scores, review volume, and premium amenity counts. Price ranges reflect member rates (wholesale + 15% markup) checked against the next 90 days of availability. All data was last verified on ${cfg.PUBLISH_DATE || new Date().toISOString().split('T')[0]}.`;
}

// ── Replace all {{TOKEN}} placeholders ────────────────────────
for (const [key, value] of Object.entries(cfg)) {
  if (typeof value === 'string') {
    html = html.split(`{{${key.toUpperCase()}}}`).join(value);
    html = html.split(`{{${key}}}`).join(value);
  }
}

// ── Warn on unreplaced tokens ─────────────────────────────────
const remaining = [...new Set((html.match(/\{\{[A-Z_]+\}\}/g) || []))];
if (remaining.length) {
  console.warn('⚠  Unreplaced tokens:', remaining.join(', '));
}

// ── Write output ──────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'sites', 'luxstay', 'guides', slug);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

console.log(`✓  Generated: sites/luxstay/guides/${slug}/index.html`);
console.log(`   URL:       ${cfg.SITE_URL}/guides/${slug}/`);
