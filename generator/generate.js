#!/usr/bin/env node
/**
 * LuxStay Site Generator
 * Usage: node generate.js <config-name>
 *
 * Reads generator/configs/<config-name>.json
 * Outputs sites/<config-name>/index.html
 * Deployment handled by deploy-all.js (Cloudflare Workers)
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

// ── Load .env if present ─────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq)] = line.slice(eq + 1);
  });
}

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

// CITIES_OPTIONS_HTML + CITY_NAV_LINKS
if (cfg.cities) {
  cfg.CITIES_OPTIONS_HTML = cfg.cities.map(c =>
    `        <option value="${c.value}">${c.label}</option>`
  ).join('\n');

  cfg.CITY_NAV_LINKS = cfg.cities.map(c =>
    `<a class="nav-link" href="/${c.value.toLowerCase().replace(/\s+/g, '-')}.html">${c.value}</a>`
  ).join('\n      ');
} else {
  cfg.CITIES_OPTIONS_HTML = '';
  cfg.CITY_NAV_LINKS = '';
}

// HOTELS_JS  (JS object literal, injected into <script>)
if (cfg.hotels) {
  const entries = Object.entries(cfg.hotels).map(([city, hotels]) => {
    const hotelLines = hotels.map(h => {
      const tags = JSON.stringify(h.tags || []);
      const badge = h.badge ? `'${h.badge}'` : 'null';
      return `    {id:'${h.id}', name:'${h.name.replace(/'/g,"\\'")}', area:'${h.area.replace(/'/g,"\\'")}', dist:'${h.dist.replace(/'/g,"\\'")}', desc:'${h.desc.replace(/'/g,"\\'")}', tags:${tags}, badge:${badge}}`;
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

// FAQ_HTML + FAQPage schema
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

  // FAQPage structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cfg.faq_items.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
  cfg.FAQ_SCHEMA_JSON = JSON.stringify(faqSchema);
}

// Organization schema
cfg.ORG_SCHEMA_JSON = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: cfg.BRAND_NAME || '',
  url: cfg.SITE_URL || cfg.SCHEMA_URL || '',
  description: cfg.SCHEMA_DESCRIPTION || '',
  contactPoint: { '@type': 'ContactPoint', email: cfg.CONTACT_EMAIL || '', contactType: 'customer support' }
});

// EDITORIAL_HTML
if (cfg.editorial) {
  const paras = (cfg.editorial.paragraphs || []).map(p => `    <p>${p}</p>`).join('\n');
  const cta = `    <p style="margin-top:16px"><a href="#" onclick="event.preventDefault();openModal()" style="color:var(--gold);font-weight:600;text-decoration:underline">Join free and see member rates →</a></p>`;
  cfg.EDITORIAL_HTML = `    <h2>${cfg.editorial.title}</h2>\n${paras}\n${cta}`;
}

// MODAL_PERKS_HTML
if (cfg.modal_perks) {
  cfg.MODAL_PERKS_HTML = cfg.modal_perks.map(p =>
    `        <div class="perk"><span class="perk-icon">${p.icon}</span><span>${p.text}</span></div>`
  ).join('\n');
}

// OG_IMAGE — default to a placeholder if not set in config
if (!cfg.OG_IMAGE) cfg.OG_IMAGE = cfg.SCHEMA_URL
  ? `${cfg.SCHEMA_URL}/og-image.jpg`
  : '';

// HOTEL_COUNT + HOTEL_SCHEMA_ITEMS — build Hotel schema from hotels data
if (cfg.hotels) {
  const allHotels = Object.values(cfg.hotels).flat();
  cfg.HOTEL_COUNT = String(allHotels.length);
  cfg.HOTEL_SCHEMA_ITEMS = allHotels.map((h, i) => JSON.stringify({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "Hotel",
      "name": h.name,
      "identifier": h.id,
      "description": h.desc || '',
      "address": { "@type": "PostalAddress", "addressLocality": h.area || '' },
      "starRating": { "@type": "Rating", "ratingValue": "5" },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": cfg.CURRENCY || "GBP",
        "availability": "https://schema.org/InStock",
        "offerCount": "1"
      }
    }
  })).join(',');
} else {
  cfg.HOTEL_COUNT = '0';
  cfg.HOTEL_SCHEMA_ITEMS = '';
}

// ── EMAILJS conditional blocks ────────────────────────────────
if (cfg.EMAILJS_PUBLIC_KEY && cfg.EMAILJS_SERVICE_ID && cfg.EMAILJS_TEMPLATE_ID) {
  cfg.EMAILJS_SCRIPT = `<!-- EmailJS — booking confirmation emails -->\n  <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>`;
  cfg.EMAILJS_CONFIG_JS = `// ── EmailJS — booking confirmation emails ─────────────────────
const EMAILJS_PUBLIC_KEY  = '${cfg.EMAILJS_PUBLIC_KEY}';
const EMAILJS_SERVICE_ID  = '${cfg.EMAILJS_SERVICE_ID}';
const EMAILJS_TEMPLATE_ID = '${cfg.EMAILJS_TEMPLATE_ID}';
if (EMAILJS_PUBLIC_KEY) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

async function sendBookingConfirmation(bk) {
  if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) return;
  var nights = bk.checkin && bk.checkout
    ? Math.max(1, Math.round((new Date(bk.checkout) - new Date(bk.checkin)) / 86400000))
    : 1;
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: bk.firstName, to_email: bk.email, hotel_name: bk.hotelName,
      checkin: bk.checkin, checkout: bk.checkout, nights: nights,
      booking_ref: bk.ref, total_price: '\\u00a3' + parseFloat(bk.price).toLocaleString('en-GB', {minimumFractionDigits: 0}),
      support_email: '${cfg.CONTACT_EMAIL || ''}'
    });
    console.log('Confirmation email sent to', bk.email);
  } catch (e) { console.warn('Email confirmation failed (non-fatal):', e?.text || e); }
}`;
  cfg.EMAILJS_SEND_JS = `try {
      sendBookingConfirmation({
        firstName: bkSess.holder.firstName, email: bkSess.holder.email,
        hotelName: bkSess.hotelName, checkin: bkSess.checkin, checkout: bkSess.checkout,
        ref: bookingRef, price: bkSess.confirmedPrice
      });
    } catch(e) { console.warn('Email send failed:', e); }`;
} else {
  cfg.EMAILJS_SCRIPT = '';
  cfg.EMAILJS_CONFIG_JS = '';
  cfg.EMAILJS_SEND_JS = '';
}

// ── REFERRAL system conditional ──────────────────────────────
if (cfg.ENABLE_REFERRALS === 'true') {
  cfg.REFERRAL_JS = `// ── Referral attribution ────────────────────────────────────────
(function captureReferral() {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem('ls_ref', ref);
    var exp = new Date(Date.now() + 30 * 864e5).toUTCString();
    document.cookie = 'ls_ref=' + encodeURIComponent(ref) + ';expires=' + exp + ';path=/;SameSite=Lax';
    if (window.posthog) posthog.register({ referral_code: ref });
  }
})();
function getReferralCode() {
  var ss = sessionStorage.getItem('ls_ref');
  if (ss) return ss;
  var m = document.cookie.match(/(?:^|;\\s*)ls_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}`;
} else {
  cfg.REFERRAL_JS = '';
}

// ── AFFILIATE nav link conditional ───────────────────────────
if (cfg.AFFILIATE_NAV_LINK && cfg.AFFILIATE_NAV_TEXT) {
  cfg.AFFILIATE_NAV_HTML = `<a class="nav-link" href="${cfg.AFFILIATE_NAV_LINK}">${cfg.AFFILIATE_NAV_TEXT}</a>`;
} else {
  cfg.AFFILIATE_NAV_HTML = '';
}

// POSTHOG_KEY — inject from config or .env
if (!cfg.POSTHOG_KEY) {
  cfg.POSTHOG_KEY = process.env.POSTHOG_PROJECT_KEY || '';
}

// STORAGE_PREFIX — brand-specific localStorage key prefix
if (!cfg.STORAGE_PREFIX) cfg.STORAGE_PREFIX = (cfg.BRAND_NAME || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '_');

// COOKIE_BANNER_BRAND (defaults to BRAND_NAME)
if (!cfg.COOKIE_BANNER_BRAND) cfg.COOKIE_BANNER_BRAND = cfg.BRAND_NAME || 'this site';

// PRIVACY_OPERATOR (defaults to BRAND_NAME)
if (!cfg.PRIVACY_OPERATOR) cfg.PRIVACY_OPERATOR = cfg.BRAND_NAME || 'this site';

// FOOTER_YEAR
if (!cfg.FOOTER_YEAR) cfg.FOOTER_YEAR = new Date().getFullYear().toString();

// ── i18n / hreflang support ───────────────────────────────────
// Config keys:
//   "lang": "de"              — language code for this variant
//   "hreflang_alternates": [  — array of {lang, url} for all language versions
//     {"lang": "en", "url": "https://luxstay.netlify.app/"},
//     {"lang": "de", "url": "https://luxstay.netlify.app/de/"}
//   ]
//   "currency": "EUR"         — currency for this locale (default: GBP)
cfg.HTML_LANG = cfg.lang || 'en';

if (cfg.hreflang_alternates && Array.isArray(cfg.hreflang_alternates)) {
  const links = cfg.hreflang_alternates.map(alt =>
    `  <link rel="alternate" hreflang="${alt.lang}" href="${alt.url}" />`
  );
  // Add x-default (first alternate, or the English one)
  const defaultAlt = cfg.hreflang_alternates.find(a => a.lang === 'en') || cfg.hreflang_alternates[0];
  if (defaultAlt) {
    links.push(`  <link rel="alternate" hreflang="x-default" href="${defaultAlt.url}" />`);
  }
  cfg.HREFLANG_TAGS = links.join('\n');
} else {
  cfg.HREFLANG_TAGS = '';
}

// Currency symbol helper — used in template for price display
const CURRENCY_SYMBOLS = { GBP: '£', EUR: '€', USD: '$', AED: 'د.إ', CHF: 'CHF' };
cfg.CURRENCY_SYMBOL = CURRENCY_SYMBOLS[cfg.currency || 'GBP'] || cfg.currency || '£';

// GSC_VERIFICATION_META — renders the meta tag only if a token is set in config
cfg.GSC_VERIFICATION_META = cfg.GSC_VERIFICATION
  ? `<meta name="google-site-verification" content="${cfg.GSC_VERIFICATION}" />`
  : '';

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

// ── Output directory ──────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'sites', configName);
fs.mkdirSync(outDir, { recursive: true });

// ── Generate robots.txt ──────────────────────────────────────
const siteUrl = cfg.SITE_URL || cfg.SCHEMA_URL || '';
const robotsTxt = `# ${cfg.BRAND_NAME} — robots.txt
User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml

# Block AI training crawlers (protect CUG pricing data)
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: FacebookBot
Disallow: /
`;
fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsTxt, 'utf8');

// ── Generate sitemap.xml ─────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
let sitemapUrls = `  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;

// Add city pages if cities exist
if (cfg.cities) {
  cfg.cities.forEach(c => {
    const slug = c.value.toLowerCase().replace(/\s+/g, '-');
    sitemapUrls += `\n  <url><loc>${siteUrl}/${slug}.html</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  });
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`;
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml, 'utf8');

// ── Generate OG image (SVG) ───────────────────────────────────
const brandName = cfg.BRAND_NAME || 'LuxStay';
const accentColor = cfg.COLOR_ACCENT || '#8c7851';
const primaryColor = cfg.COLOR_PRIMARY || '#2a2a2a';
const tagline = cfg.FOOTER_TAGLINE || cfg.HERO_EYEBROW || 'Member-only luxury hotel rates';
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${primaryColor}"/>
  <rect y="580" width="1200" height="50" fill="${accentColor}"/>
  <text x="600" y="260" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="400" fill="#ffffff">${brandName}</text>
  <text x="600" y="330" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="24" font-weight="400" fill="${accentColor}">${tagline}</text>
  <text x="600" y="400" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="20" font-weight="400" fill="rgba(255,255,255,0.6)">5-star hotels at member-only rates — join free</text>
</svg>`;
fs.writeFileSync(path.join(outDir, 'og-image.svg'), ogSvg, 'utf8');

// Update OG_IMAGE to point to SVG if still using default jpg path
if (cfg.OG_IMAGE && cfg.OG_IMAGE.endsWith('/og-image.jpg')) {
  // Re-replace the jpg reference with svg in the output HTML
  html = html.split('/og-image.jpg').join('/og-image.svg');
}

// Note: LiteAPI proxy is handled by worker.js (Cloudflare Workers).
// No per-site function copying needed — deploy-all.js handles deployment.

// ── Write final HTML (after OG image path fix) ──────────────
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

console.log(`✓  Generated: sites/${configName}/index.html`);
console.log(`   + robots.txt, sitemap.xml, og-image.svg`);
console.log(`   Deploy:    node deploy-all.js  (or: npx wrangler deploy)`);
