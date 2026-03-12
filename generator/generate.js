#!/usr/bin/env node
/**
 * LuxStay Site Generator
 * Usage: node generate.js <config-name>
 *
 * Reads generator/configs/<config-name>.json
 * Outputs sites/<config-name>/index.html + netlify.toml
 *
 * Config fields:
 *   Scalar strings  → direct {{TOKEN}} replacement in template
 *   "cities"        → array of {value, label} → builds CITIES_OPTIONS_HTML + HOTELS_JS
 *   "hotels"        → object keyed by city value → array of hotel objects
 *   "trust_items"   → array of strings → builds TRUST_ITEMS_HTML
 *   "faq_items"     → array of {q, a} → builds FAQ_HTML
 *   "editorial"     → {title, paragraphs:[]} → builds EDITORIAL_HTML
 */

const fs   = require('fs');
const path = require('path');

// ── Args ──────────────────────────────────────────────────────
const configName = process.argv[2];
if (!configName) {
  console.error('Usage: node generate.js <config-name>');
  process.exit(1);
}

// ── Load config ───────────────────────────────────────────────
const configPath = path.join(__dirname, 'configs', `${configName}.json`);
if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ── Load template ─────────────────────────────────────────────
const templatePath = path.join(__dirname, 'template.html');
if (!fs.existsSync(templatePath)) {
  console.error(`Template not found: ${templatePath}`);
  process.exit(1);
}
let html = fs.readFileSync(templatePath, 'utf8');

// ── Build derived HTML/JS from structured fields ──────────────

// CITIES_OPTIONS_HTML
if (cfg.cities) {
  const opts = cfg.cities.map(c =>
    `        <option value="${c.value}">${c.label}</option>`
  ).join('\n');
  cfg.CITIES_OPTIONS_HTML = opts;
}

// HOTELS_JS  (JS object literal, injected into <script>)
if (cfg.hotels) {
  const entries = Object.entries(cfg.hotels).map(([city, hotels]) => {
    const hotelLines = hotels.map(h => {
      const tags = JSON.stringify(h.tags || []);
      const badge = h.badge ? `'${h.badge}'` : 'null';
      return `    {id:'${h.id}', name:'${h.name.replace(/'/g,"\\'")}', emoji:'${h.emoji}', area:'${h.area.replace(/'/g,"\\'")}', dist:'${h.dist.replace(/'/g,"\\'")}', desc:'${h.desc.replace(/'/g,"\\'")}', tags:${tags}, badge:${badge}}`;
    }).join(',\n');
    return `  ${city}: [\n${hotelLines},\n  ]`;
  }).join(',\n');
  cfg.HOTELS_JS = `{\n${entries},\n}`;
}

// TRUST_ITEMS_HTML
if (cfg.trust_items) {
  const items = cfg.trust_items.map(t =>
    `    <div class="ti"><span>✓</span> ${t}</div>`
  ).join('\n');
  cfg.TRUST_ITEMS_HTML = items;
}

// FAQ_HTML
if (cfg.faq_items) {
  const faqs = cfg.faq_items.map((f, i) => {
    const open = i === 0 ? ' open' : '';
    return `    <div class="faq-item${open}">
      <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
        ${f.q} <span class="chevron">▼</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>`;
  }).join('\n');
  cfg.FAQ_HTML = faqs;
}

// EDITORIAL_HTML
if (cfg.editorial) {
  const paras = (cfg.editorial.paragraphs || []).map(p => `    <p>${p}</p>`).join('\n');
  cfg.EDITORIAL_HTML = `    <h2>${cfg.editorial.title}</h2>\n${paras}`;
}

// MODAL_PERKS_HTML
if (cfg.modal_perks) {
  cfg.MODAL_PERKS_HTML = cfg.modal_perks.map(p =>
    `        <div class="perk"><span class="perk-icon">${p.icon}</span><span>${p.text}</span></div>`
  ).join('\n');
}

// COOKIE_BANNER_BRAND (defaults to BRAND_NAME)
if (!cfg.COOKIE_BANNER_BRAND) cfg.COOKIE_BANNER_BRAND = cfg.BRAND_NAME || 'this site';

// PRIVACY_OPERATOR (defaults to BRAND_NAME)
if (!cfg.PRIVACY_OPERATOR) cfg.PRIVACY_OPERATOR = cfg.BRAND_NAME || 'this site';

// FOOTER_YEAR
if (!cfg.FOOTER_YEAR) cfg.FOOTER_YEAR = new Date().getFullYear().toString();

// ── Replace all {{TOKEN}} placeholders ────────────────────────
for (const [key, value] of Object.entries(cfg)) {
  if (typeof value === 'string') {
    html = html.split(`{{${key}}}`).join(value);
  }
}

// ── Warn on unreplaced tokens ─────────────────────────────────
const remaining = [...new Set((html.match(/\{\{[A-Z_]+\}\}/g) || []))];
if (remaining.length) {
  console.warn('⚠  Unreplaced tokens:', remaining.join(', '));
}

// ── Write output ──────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'sites', configName);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

// netlify.toml — monorepo build: generate from config then inject PostHog key
const envVar = cfg.POSTHOG_ENV_VAR || 'POSTHOG_PROJECT_KEY';
const toml = `# Netlify config for ${configName} (monorepo)
# Netlify project settings: base dir = repo root, publish = sites/${configName}
[build]
  publish = "sites/${configName}"
  command = "node generator/generate.js ${configName} && sed -i \\"s/YOUR_POSTHOG_KEY/$\{${envVar}\}/g\\" sites/${configName}/index.html"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
fs.writeFileSync(path.join(outDir, 'netlify.toml'), toml, 'utf8');

console.log(`✓  Generated: sites/${configName}/index.html`);
console.log(`✓  Generated: sites/${configName}/netlify.toml`);
console.log(`   Deploy:    netlify deploy --dir=sites/${configName} --prod`);
