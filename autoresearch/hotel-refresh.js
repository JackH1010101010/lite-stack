#!/usr/bin/env node
/**
 * autoresearch/hotel-refresh.js — Hotel Inventory Discovery
 *
 * Queries LiteAPI for high-quality hotels in every city covered by our
 * site configs. Compares against hotels already in the configs.
 * Creates a GitHub Issue listing any new hotels worth adding, with the
 * exact JSON snippet to paste into the config.
 *
 * Runs monthly via GitHub Actions cron.
 *
 * Required env vars:
 *   LITEAPI_KEY          — LiteAPI production key
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 */

const fs   = require('fs');
const path = require('path');

const LITEAPI_KEY = process.env.LITEAPI_KEY;
const GH_TOKEN    = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const GH_REPO     = process.env.GITHUB_REPOSITORY || 'JackH1010101010/lite-stack';

const LITEAPI_BASE  = 'https://api.liteapi.travel/v3.0';
const CONFIGS_DIR   = path.join(__dirname, '..', 'generator', 'configs');

// Quality thresholds — only surface hotels above these bars
const MIN_STARS    = 4;
const MIN_RATING   = 7.5;   // LiteAPI rating out of 10
const MIN_REVIEWS  = 100;

// ── Load all existing hotel IDs ────────────────────────────────
function loadExistingHotelIds() {
  const ids = new Set();
  for (const file of fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'))) {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8'));
    for (const hotels of Object.values(cfg.hotels || {})) {
      for (const h of hotels) ids.add(h.id);
    }
  }
  return ids;
}

// ── Load all cities across all configs ────────────────────────
function loadAllCities() {
  const cityToSite = {}; // city → [site names]
  for (const file of fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'))) {
    const name = path.basename(file, '.json');
    const cfg  = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8'));
    if (cfg.skip_deploy) continue;
    for (const city of Object.keys(cfg.hotels || {})) {
      if (!cityToSite[city]) cityToSite[city] = [];
      cityToSite[city].push(name);
    }
  }
  return cityToSite;
}

// ── Query LiteAPI for hotels in a city ────────────────────────
async function fetchHotelsForCity(cityName) {
  if (!LITEAPI_KEY) return [];
  try {
    const params = new URLSearchParams({
      cityName,
      limit: '50',
      starRatings: `${MIN_STARS},${MIN_STARS + 1}`,
      minRating: String(MIN_RATING),
      minReviewsCount: String(MIN_REVIEWS),
    });
    const res = await fetch(`${LITEAPI_BASE}/data/hotels?${params}`, {
      headers: { 'X-API-Key': LITEAPI_KEY, accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { console.warn(`LiteAPI ${cityName} → ${res.status}`); return []; }
    const data = await res.json();
    return data?.data || [];
  } catch (e) {
    console.warn(`Hotel fetch error for ${cityName}:`, e.message);
    return [];
  }
}

// ── Score a hotel (higher = better candidate) ─────────────────
function scoreHotel(h) {
  let score = (h.stars || 0) * 2;
  score += (h.rating || 0);
  if ((h.reviewCount || 0) >= 500)  score += 2;
  if ((h.reviewCount || 0) >= 1000) score += 2;
  if (h.main_photo)                  score += 1;
  if (h.chain)                       score += 1; // brand recognition
  return score;
}

// ── Build a config JSON snippet for a new hotel ────────────────
function buildHotelSnippet(h) {
  return {
    id: h.id,
    name: h.name,
    emoji: '🏨',
    area: h.address ? h.address.split(',').slice(-2, -1)[0]?.trim() || h.city : h.city,
    dist: `${h.stars || '?'}★ · Rating ${(h.rating || '?').toFixed ? (h.rating).toFixed(1) : h.rating}/10`,
    desc: (h.hotelDescription || '').slice(0, 120).replace(/\n/g, ' ') || `${h.stars}★ hotel in ${h.city}.`,
    tags: [],
    badge: null,
  };
}

// ── GitHub helpers ─────────────────────────────────────────────
async function createIssue(title, body) {
  if (!GH_TOKEN) { console.log('No GH_TOKEN — printing report only\n'); console.log(body); return; }
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, labels: ['hotel-refresh', 'automated'] }),
  });
  if (!res.ok) { console.warn('Issue creation failed:', res.status); return; }
  const issue = await res.json();
  console.log(`✓ Issue created: ${issue.html_url}`);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('\n🏨  Hotel inventory refresh\n');

  if (!LITEAPI_KEY) {
    console.warn('⚠  LITEAPI_KEY not set — cannot query hotel inventory');
    process.exit(0);
  }

  const existingIds  = loadExistingHotelIds();
  const cityToSite   = loadAllCities();
  const cities       = Object.keys(cityToSite);

  console.log(`Checking ${cities.length} cities: ${cities.join(', ')}`);
  console.log(`Existing hotels in configs: ${existingIds.size}\n`);

  const allNew = {}; // city → sorted new hotels

  for (const city of cities) {
    process.stdout.write(`  ${city}...`);
    const hotels = await fetchHotelsForCity(city);
    const newHotels = hotels
      .filter(h => h.id && !existingIds.has(h.id))
      .sort((a, b) => scoreHotel(b) - scoreHotel(a))
      .slice(0, 5); // top 5 new per city
    console.log(` ${hotels.length} found, ${newHotels.length} new`);
    if (newHotels.length) allNew[city] = newHotels;
  }

  const totalNew = Object.values(allNew).reduce((s, a) => s + a.length, 0);
  console.log(`\nTotal new hotels found: ${totalNew}`);

  if (totalNew === 0) {
    console.log('✅  No new hotels to report — configs are up to date');
    return;
  }

  // Build issue body
  const sections = Object.entries(allNew).map(([city, hotels]) => {
    const siteNames = cityToSite[city].join(', ');
    const hotelBlocks = hotels.map((h, i) => {
      const snippet = buildHotelSnippet(h);
      const json = JSON.stringify(snippet, null, 4).replace(/^/gm, '  ');
      return `**${i + 1}. ${h.name}** — ${h.stars}★, rating ${h.rating?.toFixed(1)}/10, ${h.reviewCount} reviews
- LiteAPI ID: \`${h.id}\`
- Address: ${h.address || 'N/A'}
- Config snippet:
\`\`\`json
${json}
\`\`\``;
    }).join('\n\n');
    return `### ${city} _(in: ${siteNames})_\n\n${hotelBlocks}`;
  }).join('\n\n---\n\n');

  const today = new Date().toISOString().slice(0, 10);
  const body  = `## 🏨 Hotel Inventory Refresh — ${today}

Found **${totalNew} new high-quality hotel(s)** (${MIN_STARS}★+, rating ${MIN_RATING}+, ${MIN_REVIEWS}+ reviews) not yet in our configs.

To add a hotel: copy the JSON snippet into the appropriate \`generator/configs/<site>.json\` hotels array for that city, then run \`node generator/generate.js <site>\` and deploy.

${sections}

---
_Generated by \`autoresearch/hotel-refresh.js\` · Thresholds: ${MIN_STARS}★+, rating ≥${MIN_RATING}, ≥${MIN_REVIEWS} reviews_`;

  await createIssue(`🏨 Hotel inventory refresh — ${totalNew} new hotel(s) found (${today})`, body);
}

main().catch(e => { console.error('hotel-refresh failed:', e.message); process.exit(1); });
