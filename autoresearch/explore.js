#!/usr/bin/env node
/**
 * autoresearch/explore.js — Market Exploration Loop
 *
 * Monthly job that scores candidate city/niche expansions we haven't
 * built yet. For each candidate:
 *   1. Checks LiteAPI for available hotel count + quality
 *   2. Scores against a model of luxury travel demand
 *   3. Cross-references GSC query data (if configured) to detect
 *      searches for cities we don't yet cover
 *   4. Creates a GitHub Issue with a ranked opportunity report
 *
 * Runs monthly via GitHub Actions cron.
 *
 * Required env vars:
 *   LITEAPI_KEY                — LiteAPI production key
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 * Optional:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — for GSC query analysis
 *   GSC_SITE_URLS               — comma-separated site URLs
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const LITEAPI_KEY  = process.env.LITEAPI_KEY;
const GH_TOKEN     = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const GH_REPO      = process.env.GITHUB_REPOSITORY || 'JackH1010101010/lite-stack';
const CONFIGS_DIR  = path.join(__dirname, '..', 'generator', 'configs');

const GSC_SA    = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? (() => { try { return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); } catch { return null; } })()
  : null;
const GSC_SITES = (process.env.GSC_SITE_URLS || '').split(',').map(s => s.trim()).filter(Boolean);

// ── Candidate cities not yet covered ──────────────────────────
// Scored by estimated luxury travel demand (subjective but consistent baseline)
// demand: 1–10 scale, higher = more luxury travel searches
const CANDIDATE_CITIES = [
  { city: 'Paris',          countryCode: 'FR', demand: 10, niche: 'city-luxury' },
  { city: 'Singapore',      countryCode: 'SG', demand: 9,  niche: 'city-luxury' },
  { city: 'Tokyo',          countryCode: 'JP', demand: 9,  niche: 'city-luxury' },
  { city: 'New York',       countryCode: 'US', demand: 9,  niche: 'city-luxury' },
  { city: 'Hong Kong',      countryCode: 'HK', demand: 8,  niche: 'city-luxury' },
  { city: 'Sydney',         countryCode: 'AU', demand: 8,  niche: 'city-luxury' },
  { city: 'Bali',           countryCode: 'ID', demand: 8,  niche: 'resort' },
  { city: 'Phuket',         countryCode: 'TH', demand: 8,  niche: 'resort' },
  { city: 'Santorini',      countryCode: 'GR', demand: 8,  niche: 'resort' },
  { city: 'Marrakech',      countryCode: 'MA', demand: 7,  niche: 'boutique' },
  { city: 'Rome',           countryCode: 'IT', demand: 8,  niche: 'city-luxury' },
  { city: 'Barcelona',      countryCode: 'ES', demand: 7,  niche: 'city-luxury' },
  { city: 'Miami',          countryCode: 'US', demand: 7,  niche: 'resort' },
  { city: 'Mykonos',        countryCode: 'GR', demand: 7,  niche: 'resort' },
  { city: 'Amalfi',         countryCode: 'IT', demand: 7,  niche: 'resort' },
  { city: 'Doha',           countryCode: 'QA', demand: 7,  niche: 'city-luxury' },
  { city: 'Abu Dhabi',      countryCode: 'AE', demand: 7,  niche: 'city-luxury' },
  { city: 'Oman',           countryCode: 'OM', demand: 6,  niche: 'resort' },
  { city: 'Zanzibar',       countryCode: 'TZ', demand: 6,  niche: 'resort' },
  { city: 'Seychelles',     countryCode: 'SC', demand: 6,  niche: 'resort' },
  { city: 'Mauritius',      countryCode: 'MU', demand: 6,  niche: 'resort' },
  { city: 'Cape Town',      countryCode: 'ZA', demand: 6,  niche: 'city-luxury' },
  { city: 'Vienna',         countryCode: 'AT', demand: 6,  niche: 'city-luxury' },
  { city: 'Amsterdam',      countryCode: 'NL', demand: 6,  niche: 'city-luxury' },
  { city: 'Kyoto',          countryCode: 'JP', demand: 7,  niche: 'boutique' },
];

// Amenity combos not yet covered for existing cities
const CANDIDATE_AMENITIES = [
  'butler service', 'private pool', 'over-water suite',
  'helipad', 'michelin restaurant', 'private cinema',
  'yacht access', 'golf course', 'ski-in ski-out',
];

// ── Load currently covered cities ─────────────────────────────
function loadCoveredCities() {
  const covered = new Set();
  for (const file of fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'))) {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8'));
    if (cfg.skip_deploy) continue;
    for (const city of Object.keys(cfg.hotels || {})) covered.add(city.toLowerCase());
  }
  return covered;
}

// Load existing amenity page slugs
function loadCoveredAmenities() {
  const covered = new Set();
  for (const file of fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'))) {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8'));
    for (const a of (cfg.seo_amenity_pages || [])) covered.add(a.amenity?.toLowerCase());
  }
  return covered;
}

// ── Query LiteAPI for candidate city ──────────────────────────
async function checkCityOpportunity(candidate) {
  if (!LITEAPI_KEY) return { hotelCount: 0, avgRating: 0, avgStars: 0 };
  try {
    const params = new URLSearchParams({
      cityName: candidate.city,
      limit: '100',
      starRatings: '4,5',
      minRating: '7',
    });
    const res = await fetch(`https://api.liteapi.travel/v3.0/data/hotels?${params}`, {
      headers: { 'X-API-Key': LITEAPI_KEY, accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { hotelCount: 0, avgRating: 0, avgStars: 0 };
    const data = await res.json();
    const hotels = data?.data || [];
    if (!hotels.length) return { hotelCount: 0, avgRating: 0, avgStars: 0 };
    const avgRating = hotels.reduce((s, h) => s + (h.rating || 0), 0) / hotels.length;
    const avgStars  = hotels.reduce((s, h) => s + (h.stars || 0), 0) / hotels.length;
    return { hotelCount: hotels.length, avgRating: +avgRating.toFixed(1), avgStars: +avgStars.toFixed(1) };
  } catch (e) {
    console.warn(`  LiteAPI error for ${candidate.city}:`, e.message);
    return { hotelCount: 0, avgRating: 0, avgStars: 0 };
  }
}

// ── GSC: check if any search query mentions a candidate city ──
async function gscAccessToken() {
  if (!GSC_SA) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const pay = Buffer.from(JSON.stringify({
      iss: GSC_SA.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    })).toString('base64url');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${hdr}.${pay}`);
    const jwt = `${hdr}.${pay}.${sign.sign(GSC_SA.private_key, 'base64url')}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    return (await res.json()).access_token || null;
  } catch { return null; }
}

async function getGscQueries(token) {
  if (!token || !GSC_SITES.length) return [];
  const allQueries = [];
  const now = new Date();
  const from = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  for (const site of GSC_SITES) {
    try {
      const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: from, endDate: to, dimensions: ['query'], rowLimit: 100 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const row of (data.rows || [])) allQueries.push({ query: row.keys[0], clicks: row.clicks, impressions: row.impressions });
    } catch { /* skip */ }
  }
  return allQueries;
}

// Check if any GSC query mentions this city
function gscMentionsCity(queries, cityName) {
  const lower = cityName.toLowerCase();
  const matches = queries.filter(q => q.query.toLowerCase().includes(lower));
  return {
    mentioned: matches.length > 0,
    totalClicks: matches.reduce((s, q) => s + q.clicks, 0),
    totalImpressions: matches.reduce((s, q) => s + q.impressions, 0),
    topQuery: matches.sort((a, b) => b.impressions - a.impressions)[0]?.query || null,
  };
}

// ── Score an opportunity ───────────────────────────────────────
// Returns 0–100
function scoreOpportunity(candidate, liteApiData, gscSignal) {
  let score = 0;
  // Demand signal (0–30)
  score += candidate.demand * 3;
  // LiteAPI availability (0–30) — more good hotels = more content to work with
  const hotelScore = Math.min(liteApiData.hotelCount / 5, 10) * 3;
  score += hotelScore;
  // Quality of available inventory (0–20)
  score += (liteApiData.avgRating - 7) * 5 * 2; // each 0.1 above 7 = 1pt
  score += (liteApiData.avgStars - 4) * 5;
  // GSC signal (0–20) — people are already searching for this
  if (gscSignal.mentioned) {
    score += 10;
    score += Math.min(gscSignal.totalImpressions / 10, 10);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── GitHub issue ───────────────────────────────────────────────
async function createIssue(title, body) {
  if (!GH_TOKEN) { console.log('\n' + body); return; }
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, labels: ['opportunity', 'automated'] }),
  });
  if (!res.ok) { console.warn('Issue creation failed:', res.status); return; }
  const issue = await res.json();
  console.log(`✓ Issue created: ${issue.html_url}`);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('\n🔭  Exploration loop — market opportunity scan\n');

  const coveredCities    = loadCoveredCities();
  const coveredAmenities = loadCoveredAmenities();

  const candidates = CANDIDATE_CITIES.filter(c => !coveredCities.has(c.city.toLowerCase()));
  console.log(`Covered cities: ${[...coveredCities].join(', ')}`);
  console.log(`Candidate cities to evaluate: ${candidates.length}\n`);

  // GSC queries for cross-referencing
  let gscQueries = [];
  if (GSC_SA) {
    console.log('Fetching GSC query data...');
    const token = await gscAccessToken();
    if (token) gscQueries = await getGscQueries(token);
    console.log(`  ${gscQueries.length} GSC queries loaded\n`);
  }

  // Score each candidate
  const scored = [];
  for (const candidate of candidates.slice(0, 15)) { // limit API calls to top 15 candidates by demand
    if (!candidate.demand) continue;
    process.stdout.write(`  Checking ${candidate.city}...`);
    const liteData = await checkCityOpportunity(candidate);
    const gscSignal = gscMentionsCity(gscQueries, candidate.city);
    const score = scoreOpportunity(candidate, liteData, gscSignal);
    scored.push({ ...candidate, ...liteData, gscSignal, score });
    console.log(` score=${score}, hotels=${liteData.hotelCount}, gsc=${gscSignal.mentioned ? '✓' : '–'}`);
  }

  scored.sort((a, b) => b.score - a.score);

  // Amenity opportunities for existing cities
  const newAmenities = CANDIDATE_AMENITIES.filter(a => !coveredAmenities.has(a));

  const today = new Date().toISOString().slice(0, 10);

  // Build issue
  const topCities = scored.slice(0, 10);
  const cityRows  = topCities.map((c, i) => {
    const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
    const gscStr = c.gscSignal.mentioned
      ? `✅ ~${Math.round(c.gscSignal.totalImpressions)} impressions/mo${c.gscSignal.topQuery ? ` ("${c.gscSignal.topQuery}")` : ''}`
      : '–';
    return `| ${medal} | **${c.city}** | ${c.niche} | ${c.score}/100 | ${c.hotelCount} | ${c.avgRating}/10 | ${gscStr} |`;
  }).join('\n');

  const top3Recommendations = scored.slice(0, 3).map((c, i) => {
    const why = [];
    if (c.score >= 70) why.push('high demand score');
    if (c.hotelCount >= 10) why.push(`${c.hotelCount} quality hotels available`);
    if (c.gscSignal.mentioned) why.push(`existing search traffic (${Math.round(c.gscSignal.totalImpressions)} impressions)`);
    return `**${i+1}. ${c.city}** (score: ${c.score}/100) — ${why.join(', ') || 'good fundamentals'}.\nNext action: \`cp generator/configs/luxstay.json generator/configs/${c.city.toLowerCase().replace(/\s+/g, '-')}.json\` then customise hotels array.`;
  }).join('\n\n');

  const amenitySection = newAmenities.length
    ? `\n\n### Amenity Page Gaps (for existing cities)\n\nThese amenity combos aren't yet covered by any SEO page:\n\n${newAmenities.map(a => `- **${a}** — add to \`seo_amenity_pages\` in relevant site configs`).join('\n')}`
    : '';

  const body = `## 🔭 Market Opportunity Report — ${today}

Scanned **${candidates.length} candidate cities** against LiteAPI inventory and GSC search data.

### City Expansion Opportunities (ranked)

| # | City | Niche | Score | Hotels (4★+) | Avg Rating | GSC Signal |
|---|------|-------|-------|--------------|------------|------------|
${cityRows}

### Top 3 Recommendations

${top3Recommendations}${amenitySection}

---
### How Scores Work
- **Demand (0–30):** Estimated global luxury travel search volume for this destination
- **Inventory (0–30):** Number of 4★+ hotels available in LiteAPI
- **Quality (0–20):** Average rating and star level of available inventory
- **GSC Signal (0–20):** Whether your existing sites already attract searches for this city

---
_Generated by \`autoresearch/explore.js\` · ${new Date().toISOString()}_`;

  await createIssue(`🔭 Opportunity report — top city: ${scored[0]?.city || '?'} (score ${scored[0]?.score || 0}) · ${today}`, body);
}

main().catch(e => { console.error('explore failed:', e.message); process.exit(1); });
