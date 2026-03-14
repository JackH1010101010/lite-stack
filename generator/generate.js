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

// CITY_MARKUPS_JS  (JS object literal for per-city markup tiers)
cfg.CITY_MARKUPS_JS = cfg.CITY_MARKUPS ? JSON.stringify(cfg.CITY_MARKUPS) : '{}';

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
  const baseUrl = cfg.SITE_URL || cfg.SCHEMA_URL || '';
  cfg.HOTEL_SCHEMA_ITEMS = allHotels.map((h, i) => {
    const item = {
      "@type": "Hotel",
      "name": h.name,
      "identifier": h.id,
      "description": h.desc || '',
      "url": baseUrl + '/',
      "address": { "@type": "PostalAddress", "addressLocality": h.area || '' },
      "starRating": { "@type": "Rating", "ratingValue": "5" },
      "numberOfRooms": 1,
      "checkinTime": "15:00",
      "checkoutTime": "11:00",
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": cfg.currency || "GBP",
        "availability": "https://schema.org/InStock",
        "offerCount": "1"
      }
    };
    // Add amenity features from tags
    if (h.tags && h.tags.length) {
      item.amenityFeature = h.tags.map(t => ({
        "@type": "LocationFeatureSpecification",
        "name": t,
        "value": true
      }));
    }
    return JSON.stringify({ "@type": "ListItem", "position": i + 1, "item": item });
  }).join(',');
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

// INTERNAL_LINKS_HTML — link grid to all landing pages + city pages
{
  const links = [];
  // City pages
  if (cfg.cities) {
    cfg.cities.forEach(c => {
      const slug = c.value.toLowerCase().replace(/\s+/g, '-');
      links.push({ href: `/${slug}.html`, title: `${c.value} Hotels`, desc: `Member rates on 5-star ${c.value} hotels` });
    });
  }
  // Region pages
  if (cfg.seo_regions && Array.isArray(cfg.seo_regions)) {
    cfg.seo_regions.forEach(r => {
      links.push({ href: `/${r.slug}.html`, title: r.name, desc: (r.angle || '').slice(0, 80) + '…' });
    });
  }
  // Amenity pages
  if (cfg.seo_amenity_pages && Array.isArray(cfg.seo_amenity_pages)) {
    cfg.seo_amenity_pages.forEach(ap => {
      links.push({ href: `/${ap.slug}.html`, title: ap.displayName, desc: `Member rates on luxury ${ap.amenity} hotels` });
    });
  }
  if (links.length) {
    const cards = links.map(l =>
      `      <a class="il-card" href="${l.href}"><div class="il-title">${l.title}</div><div class="il-desc">${l.desc}</div></a>`
    ).join('\n');
    cfg.INTERNAL_LINKS_HTML = `  <div class="internal-links">\n    <h2>Explore by destination</h2>\n    <div class="il-grid">\n${cards}\n    </div>\n  </div>`;
  } else {
    cfg.INTERNAL_LINKS_HTML = '';
  }
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

# Allow AI search bots (for citations in ChatGPT, Perplexity, Google AI)
User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# Block AI training crawlers (protect CUG pricing data from model training)
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
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

// ── Generate SEO landing pages ────────────────────────────────
const cityTemplatePath = path.join(__dirname, 'city-template.html');
let landingPages = [];

if (fs.existsSync(cityTemplatePath)) {
  const cityTemplateRaw = fs.readFileSync(cityTemplatePath, 'utf8');

  // Combine city pages, seo_regions, and seo_amenity_pages into a unified list
  const allLandingPages = [];

  // City index pages — one per city in the cities array
  if (cfg.cities && cfg.hotels) {
    cfg.cities.forEach(c => {
      const cityName = c.value;
      const slug = cityName.toLowerCase().replace(/\s+/g, '-');
      const hotels = cfg.hotels[cityName] || [];
      if (!hotels.length) return;

      // Collect related landing page links for this city
      const relatedLinks = [];
      if (cfg.seo_regions) cfg.seo_regions.filter(r => r.city === cityName).forEach(r => relatedLinks.push({ href: `/${r.slug}.html`, title: r.name }));
      if (cfg.seo_amenity_pages) cfg.seo_amenity_pages.filter(a => a.city === cityName).forEach(a => relatedLinks.push({ href: `/${a.slug}.html`, title: a.displayName }));
      const relatedHtml = relatedLinks.length
        ? `<p style="margin-top:16px;font-size:13px;color:var(--grey-text)">Related: ${relatedLinks.map(l => `<a href="${l.href}" style="color:var(--gold);text-decoration:underline">${l.title}</a>`).join(' · ')}</p>`
        : '';

      allLandingPages.push({
        slug: slug,
        type: 'city',
        h1: `${cityName} Luxury Hotels — ${cfg.BRAND_NAME} Member Rates`,
        metaTitle: `${cityName} Luxury Hotels | ${cfg.BRAND_NAME} — Save 10–30% vs Booking.com`,
        metaDesc: `${cfg.BRAND_NAME} members save 10–30% on 5-star ${cityName} hotels vs Booking.com. Same hotels, lower prices. Free to join.`,
        intro: `Browse ${hotels.length} hand-picked 5-star hotels in ${cityName} with live member rates. ${cfg.BRAND_NAME} members access below-retail pricing through our closed distribution channel — the same hotels you'd find on Booking.com, at 10–30% less.`,
        keyword: `${cityName} luxury hotels member rates`,
        city: cityName,
        hotels: hotels,
        editorialTitle: `${cityName} Hotels — Why Member Rates Are Lower`,
        editorialBody: `<p>Hotels in ${cityName} release a portion of their inventory at <strong>net rates</strong> through Closed User Group channels. These rates are restricted from public display and can only be shown to verified members of gated platforms like ${cfg.BRAND_NAME}.</p><p>When you join (free, 30 seconds), you unlock these rates — typically <strong>10–30% below Booking.com</strong> — on every property below.</p>${relatedHtml}`,
        breadcrumbText: cityName,
      });
    });
  }

  // Region pages — one per seo_region entry
  if (cfg.seo_regions && Array.isArray(cfg.seo_regions)) {
    cfg.seo_regions.forEach(region => {
      const cityName = region.city || '';
      const hotels = cfg.hotels?.[cityName] || [];
      if (!hotels.length) return; // skip if no hotels for this city

      allLandingPages.push({
        slug: region.slug,
        type: 'region',
        h1: `${region.name} — ${cfg.BRAND_NAME || ''} Member Rates`,
        metaTitle: `${region.name} | ${cfg.BRAND_NAME} — Member Hotel Rates 10–30% Below Booking.com`,
        metaDesc: (region.angle || '').slice(0, 155),
        intro: region.angle || '',
        keyword: region.keyword || '',
        city: cityName,
        hotels: hotels,
        editorialTitle: `Why ${cfg.BRAND_NAME} rates are lower`,
        editorialBody: `<p>${cfg.BRAND_NAME} operates as a Closed User Group (CUG) platform. Hotels release a portion of their inventory at <strong>net rates</strong> — below their public retail price — through private distribution channels. When you join ${cfg.BRAND_NAME} (free, 30 seconds), you become a verified CUG member and unlock these below-retail rates.</p><p>The hotels, room types, and dates are identical to what you'd find on Booking.com or Expedia. The only difference is the price — typically <strong>10–30% lower</strong>.</p>`,
        breadcrumbText: region.name,
      });
    });
  }

  // Amenity pages — one per seo_amenity_pages entry
  if (cfg.seo_amenity_pages && Array.isArray(cfg.seo_amenity_pages)) {
    cfg.seo_amenity_pages.forEach(ap => {
      const cityName = ap.city || '';
      const allHotels = cfg.hotels?.[cityName] || [];
      // Filter to hotels with matching amenity tag
      const amenityTag = (ap.amenity || '').toLowerCase();
      const matchingHotels = allHotels.filter(h =>
        (h.tags || []).some(t => t.toLowerCase().includes(amenityTag))
      );
      // Fall back to all city hotels if no tag matches
      const hotels = matchingHotels.length ? matchingHotels : allHotels;
      if (!hotels.length) return;

      allLandingPages.push({
        slug: ap.slug,
        type: 'amenity',
        h1: `${ap.displayName} — Member Rates on ${cfg.BRAND_NAME}`,
        metaTitle: `${ap.displayName} | ${cfg.BRAND_NAME} — Save 10–30% vs Booking.com`,
        metaDesc: `Unlock member rates on ${ap.displayName.toLowerCase()}. ${cfg.BRAND_NAME} members save 10–30% on 5-star ${amenityTag} hotels vs public booking sites. Free to join.`,
        intro: `Looking for luxury ${amenityTag} hotels in ${cityName}? ${cfg.BRAND_NAME} members access the same 5-star properties you'd find on Booking.com — at rates 10–30% lower. No subscription, no catch. Just below-retail pricing through our closed member channel.`,
        keyword: `${ap.displayName} member rates`,
        city: cityName,
        hotels: hotels,
        editorialTitle: `About ${ap.displayName}`,
        editorialBody: `<p>${cfg.BRAND_NAME} curates the finest ${amenityTag} hotels in ${cityName}, each hand-verified for quality. As a member, you access net rates on these properties — the same wholesale pricing that travel agents use — at <strong>10–30% below public booking platforms</strong>.</p><p>Join free to see your member rate on every property below.</p>`,
        breadcrumbText: ap.displayName,
      });
    });
  }

  // Generate each landing page
  allLandingPages.forEach(lp => {
    let lpHtml = cityTemplateRaw;

    // Build hotels JS array for this page
    const hotelLines = lp.hotels.map(h => {
      const tags = JSON.stringify(h.tags || []);
      const badge = h.badge ? `'${h.badge}'` : 'null';
      return `  {id:'${h.id}', name:'${h.name.replace(/'/g,"\\'")}', area:'${h.area.replace(/'/g,"\\'")}', dist:'${h.dist.replace(/'/g,"\\'")}', desc:'${h.desc.replace(/'/g,"\\'")}', tags:${tags}, badge:${badge}}`;
    }).join(',\n');
    const lpHotelsJs = `[\n${hotelLines}\n]`;

    // Build breadcrumb schema
    const breadcrumbSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: cfg.BRAND_NAME || '', item: siteUrl + '/' },
        { '@type': 'ListItem', position: 2, name: lp.breadcrumbText }
      ]
    });

    // Build editorial HTML
    const editorialHtml = `<h2>${lp.editorialTitle}</h2>\n${lp.editorialBody}\n<p style="margin-top:16px"><a href="#" onclick="event.preventDefault();openModal()" style="color:var(--gold);font-weight:600;text-decoration:underline">Join free and see member rates →</a></p>`;

    // Build related links (other landing pages, excluding self)
    const relatedPages = allLandingPages.filter(p => p.slug !== lp.slug).slice(0, 6);
    let relatedLinksHtml = '';
    if (relatedPages.length) {
      const cards = relatedPages.map(p =>
        `    <a class="il-card" href="/${p.slug}.html"><div class="il-title">${p.h1.split(' — ')[0]}</div><div class="il-desc">${p.type === 'city' ? 'City guide' : p.type === 'region' ? 'Regional guide' : 'Amenity guide'}</div></a>`
      ).join('\n');
      relatedLinksHtml = `<div style="margin:48px 0 0"><h2 style="font-family:var(--font-serif);font-size:22px;font-weight:400;color:var(--black);margin-bottom:12px">Explore more</h2><div class="il-grid">\n${cards}\n</div></div>`;
    }

    // Set LP-specific tokens
    const lpTokens = {
      LP_META_TITLE: lp.metaTitle,
      LP_META_DESC: lp.metaDesc,
      LP_CANONICAL: `${siteUrl}/${lp.slug}.html`,
      LP_H1: lp.h1,
      LP_INTRO: lp.intro,
      LP_HOTELS_JS: lpHotelsJs,
      LP_BREADCRUMB_SCHEMA: breadcrumbSchema,
      LP_BREADCRUMB_TEXT: lp.breadcrumbText,
      LP_EDITORIAL_HTML: editorialHtml,
      LP_SLUG: lp.slug,
      LP_TYPE: lp.type,
      LP_CITY: lp.city || '',
      LP_RELATED_LINKS_HTML: relatedLinksHtml,
    };

    // Replace LP tokens first
    for (const [key, value] of Object.entries(lpTokens)) {
      lpHtml = lpHtml.split(`{{${key}}}`).join(value);
    }

    // Replace shared tokens (BRAND_NAME, colors, etc.)
    for (const [key, value] of Object.entries(cfg)) {
      if (typeof value === 'string') {
        lpHtml = lpHtml.split(`{{${key}}}`).join(value);
      }
    }

    // Write the file
    fs.writeFileSync(path.join(outDir, `${lp.slug}.html`), lpHtml, 'utf8');
    landingPages.push(lp.slug);
  });
}

// ── Update sitemap with landing pages ────────────────────────
if (landingPages.length) {
  landingPages.forEach(slug => {
    sitemapUrls += `\n  <url><loc>${siteUrl}/${slug}.html</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  });
  // Rewrite sitemap with landing pages included
  const updatedSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`;
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), updatedSitemapXml, 'utf8');
}

console.log(`✓  Generated: sites/${configName}/index.html`);
if (landingPages.length) {
  console.log(`   + ${landingPages.length} SEO landing pages: ${landingPages.map(s => s + '.html').join(', ')}`);
}
console.log(`   + robots.txt, sitemap.xml, og-image.svg`);
console.log(`   Deploy:    node deploy-all.js  (or: npx wrangler deploy)`);
