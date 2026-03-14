#!/usr/bin/env node
/**
 * Pre-fetch hotel photos + review data from LiteAPI
 *
 * Usage: node generator/prefetch-hotels.js
 *
 * Reads all hotel IDs from configs, fetches data/hotel for each,
 * and writes a cache file (generator/hotel-cache.json) with:
 *   { "hotelId": { photo: "url", rating: 9.1, ratingLabel: "Exceptional", reviewCount: 234 } }
 *
 * The generator reads this cache and bakes photo URLs + ratings directly
 * into the HTML — eliminating all data/hotel API calls at runtime.
 *
 * Run this periodically (weekly) or when adding new hotels.
 */

const fs   = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq)] = line.slice(eq + 1);
  });
}

const API_KEY  = process.env.LITEAPI_PROD_KEY || process.env.LITEAPI_SANDBOX_KEY;
const API_BASE = 'https://api.liteapi.travel/v3.0';
const CACHE_PATH = path.join(__dirname, 'hotel-cache.json');

if (!API_KEY) {
  console.error('No LiteAPI key found in .env');
  process.exit(1);
}

// Collect all unique hotel IDs from all configs
function getAllHotelIds() {
  const configDir = path.join(__dirname, 'configs');
  const ids = new Set();
  const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const cfg = JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8'));
    const hotels = cfg.hotels || {};
    for (const city of Object.keys(hotels)) {
      for (const h of hotels[city]) {
        ids.add(h.id);
      }
    }
    // Also check seo_regions and seo_amenity_pages (they reference cities from main hotels)
    const regionCities = (cfg.seo_regions || []).map(r => r.city).filter(Boolean);
    const amenityCities = (cfg.seo_amenity_pages || []).map(a => a.city).filter(Boolean);
    for (const city of [...regionCities, ...amenityCities]) {
      for (const h of (hotels[city] || [])) {
        ids.add(h.id);
      }
    }
  }
  return [...ids];
}

async function fetchHotelData(hotelId) {
  const url = `${API_BASE}/data/hotel?hotelId=${hotelId}`;
  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': API_KEY, 'accept': 'application/json' }
    });
    if (!resp.ok) {
      console.warn(`  ⚠ ${hotelId}: HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const hd = data?.data;
    if (!hd) return null;

    // Pick best photo
    const images = hd.hotelImages || [];
    const preferred = images.find(i => /room|exterior|lobby|pool/i.test(i.caption || ''));
    const photo = (preferred || images[0])?.url || null;

    // Rating
    const rating = parseFloat(hd.starRating || hd.rating || hd.reviewRating || 0);
    const reviewCount = parseInt(hd.reviewCount || hd.numberOfReviews || 0);
    const ratingLabel = rating >= 9 ? 'Exceptional' : rating >= 8 ? 'Excellent' : rating >= 7 ? 'Very Good' : rating > 0 ? 'Good' : '';

    return { photo, rating: rating || null, ratingLabel, reviewCount: reviewCount || null };
  } catch (e) {
    console.warn(`  ⚠ ${hotelId}: ${e.message}`);
    return null;
  }
}

async function main() {
  const ids = getAllHotelIds();
  console.log(`Fetching data for ${ids.length} hotels...\n`);

  // Load existing cache to preserve data for hotels we can't reach
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch {}
  }

  // Fetch in batches of 5 to avoid rate limits
  const BATCH = 5;
  let fetched = 0, failed = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(id => fetchHotelData(id)));

    batch.forEach((id, idx) => {
      if (results[idx]) {
        cache[id] = results[idx];
        const r = results[idx];
        console.log(`  ✓ ${id}: ${r.photo ? 'photo' : 'no photo'}, ${r.rating ? r.rating.toFixed(1) + ' ' + r.ratingLabel : 'no rating'}${r.reviewCount ? ' (' + r.reviewCount + ' reviews)' : ''}`);
        fetched++;
      } else {
        failed++;
      }
    });

    // Small delay between batches
    if (i + BATCH < ids.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(`\n✓ Cache written: ${CACHE_PATH}`);
  console.log(`  ${fetched} fetched, ${failed} failed, ${Object.keys(cache).length} total in cache`);
}

main().catch(e => { console.error(e); process.exit(1); });
