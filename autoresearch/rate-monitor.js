#!/usr/bin/env node
/**
 * autoresearch/rate-monitor.js — Competitive Rate & Margin Monitoring
 *
 * For each hotel across all site configs, fetches LiteAPI rates (CUG net)
 * and compares against retail/SSP rates. Flags:
 *   - Hotels where margin < MIN_SAVING (8%) → hide or de-prioritise
 *   - Hotels where margin > 25% → feature more prominently
 *   - Hotels with no availability → warn
 *
 * Outputs rate-snapshot.json for the orchestrator to consume as a signal.
 * Creates a GitHub issue if action is needed.
 *
 * Usage:
 *   node autoresearch/rate-monitor.js                  (full run)
 *   node autoresearch/rate-monitor.js --dry-run        (fetch + analyse, no issue)
 *   node autoresearch/rate-monitor.js --site luxstay   (single site)
 *
 * Required env vars:
 *   LITEAPI_KEY          — LiteAPI production key
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 */

const fs   = require('fs');
const path = require('path');

const ROOT          = path.join(__dirname, '..');
const CONFIGS_DIR   = path.join(ROOT, 'generator', 'configs');
const SNAPSHOT_FILE = path.join(__dirname, 'rate-snapshot.json');
const HISTORY_FILE  = path.join(__dirname, 'history.json');
const LITEAPI_KEY   = process.env.LITEAPI_KEY || '';
const LITEAPI_BASE  = 'https://api.liteapi.travel/v3.0';
const GH_TOKEN      = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GH_REPO       = process.env.GITHUB_REPOSITORY || '';
const GH_API        = 'https://api.github.com';

// Margin thresholds
const MIN_SAVING     = 0.08;  // 8% — below this, hide or de-prioritise
const GREAT_SAVING   = 0.25;  // 25% — above this, feature prominently
const ALERT_ZERO_PCT = 0.20;  // Alert if >20% of hotels have zero availability

// CLI
const args    = process.argv.slice(2);
const getArg  = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const DRY_RUN = args.includes('--dry-run');
const SITE    = getArg('--site', null);

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── LiteAPI: fetch rates for a hotel ─────────────────────────
async function fetchHotelRates(hotelId) {
  if (!LITEAPI_KEY) return null;

  // Dates: check-in = 14 days from now, 1 night
  const checkin  = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const checkout = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    hotelIds: hotelId,
    checkin,
    checkout,
    adults: '2',
    currency: 'GBP'
  });

  try {
    const res = await fetch(`${LITEAPI_BASE}/hotels/rates?${params}`, {
      headers: { 'X-API-Key': LITEAPI_KEY, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      if (res.status === 429) return { throttled: true };
      return null;
    }
    const data = await res.json();
    return data?.data?.[0] || null;
  } catch {
    return null;
  }
}

// ── Extract margin from rate data ────────────────────────────
function analyseRate(rateData) {
  if (!rateData || !rateData.roomTypes?.length) {
    return { available: false, cug_rate: null, retail_rate: null, margin: null };
  }

  // Find the cheapest room
  let cheapestCug = Infinity;
  let cheapestRetail = Infinity;

  for (const room of rateData.roomTypes) {
    for (const rate of (room.rates || [])) {
      const cugPrice    = parseFloat(rate.retailRate?.total?.[0]?.amount || rate.totalAmount || 0);
      const retailPrice = parseFloat(rate.retailRate?.suggestedSellingPrice?.[0]?.amount || 0);

      if (cugPrice > 0 && cugPrice < cheapestCug) cheapestCug = cugPrice;
      if (retailPrice > 0 && retailPrice < cheapestRetail) cheapestRetail = retailPrice;
    }
  }

  if (cheapestCug === Infinity) return { available: false, cug_rate: null, retail_rate: null, margin: null };

  const cugRate    = cheapestCug;
  const retailRate = cheapestRetail === Infinity ? null : cheapestRetail;
  const margin     = retailRate ? ((retailRate - cugRate) / retailRate) : null;

  return { available: true, cug_rate: cugRate, retail_rate: retailRate, margin };
}

// ── Load all hotels from configs ─────────────────────────────
function loadAllHotels() {
  const configFiles = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'));
  const allHotels = [];

  for (const file of configFiles) {
    const siteName = file.replace('.json', '');
    if (SITE && siteName !== SITE) continue;

    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8'));
    if (!cfg.hotels) continue;

    for (const [city, hotels] of Object.entries(cfg.hotels)) {
      for (const hotel of hotels) {
        if (hotel.id) {
          allHotels.push({
            site: siteName,
            city,
            id: hotel.id,
            name: hotel.name,
            area: hotel.area
          });
        }
      }
    }
  }

  return allHotels;
}

// ── Build GitHub issue body ──────────────────────────────────
function buildIssueBody(snapshot) {
  const { timestamp, total_hotels, checked, unavailable, low_margin, great_margin, results } = snapshot;

  const lowMarginList = results
    .filter(r => r.status === 'low_margin')
    .map(r => `| ${r.site} | ${r.name} | ${r.city} | ${(r.margin * 100).toFixed(1)}% | De-prioritise |`)
    .join('\n');

  const greatMarginList = results
    .filter(r => r.status === 'great_margin')
    .map(r => `| ${r.site} | ${r.name} | ${r.city} | ${(r.margin * 100).toFixed(1)}% | Feature |`)
    .join('\n');

  const unavailableList = results
    .filter(r => r.status === 'unavailable')
    .map(r => `- ${r.name} (${r.site} / ${r.city})`)
    .join('\n');

  const actionNeeded = low_margin > 0 || unavailable > (total_hotels * ALERT_ZERO_PCT);

  return `## Rate Monitor — ${new Date(timestamp).toISOString().slice(0, 10)}

### Summary
- **Hotels checked:** ${checked}/${total_hotels}
- **Unavailable:** ${unavailable} (${((unavailable / total_hotels) * 100).toFixed(0)}%)
- **Low margin (<${(MIN_SAVING * 100).toFixed(0)}%):** ${low_margin}
- **Great margin (>${(GREAT_SAVING * 100).toFixed(0)}%):** ${great_margin}
- **Healthy:** ${checked - unavailable - low_margin - great_margin}

${low_margin > 0 ? `### ⚠️ Low Margin Hotels (consider hiding)
| Site | Hotel | City | Margin | Action |
|------|-------|------|--------|--------|
${lowMarginList}` : ''}

${great_margin > 0 ? `### 🌟 Great Margin Hotels (feature prominently)
| Site | Hotel | City | Margin | Action |
|------|-------|------|--------|--------|
${greatMarginList}` : ''}

${unavailable > 0 ? `### 🔴 Unavailable Hotels
${unavailableList}` : ''}

<!-- machine: ${JSON.stringify({ action_needed: actionNeeded, low_margin, great_margin, unavailable, checked, timestamp })} -->`;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n💰  Rate Monitor${SITE ? `: ${SITE}` : ' (all sites)'}\n`);

  const allHotels = loadAllHotels();
  console.log(`  Found ${allHotels.length} hotels across configs.\n`);

  if (allHotels.length === 0) {
    console.log('  No hotels with IDs found in configs.');
    return;
  }

  const results = [];
  let checked = 0, unavailable = 0, lowMargin = 0, greatMargin = 0, throttled = 0;

  for (const hotel of allHotels) {
    process.stdout.write(`  [${checked + 1}/${allHotels.length}] ${hotel.name}...`);

    if (!LITEAPI_KEY) {
      // Simulated mode: generate plausible margins for dry-run testing
      const simMargin = 0.05 + Math.random() * 0.30;
      const simRetail = 200 + Math.random() * 500;
      const simCug    = simRetail * (1 - simMargin);
      const status = simMargin < MIN_SAVING ? 'low_margin' : simMargin > GREAT_SAVING ? 'great_margin' : 'healthy';

      results.push({
        ...hotel, status,
        cug_rate: Math.round(simCug * 100) / 100,
        retail_rate: Math.round(simRetail * 100) / 100,
        margin: Math.round(simMargin * 1000) / 1000,
        simulated: true
      });

      if (status === 'low_margin') lowMargin++;
      if (status === 'great_margin') greatMargin++;
      console.log(` ${status} (${(simMargin * 100).toFixed(1)}%) [simulated]`);
      checked++;
      continue;
    }

    const rateData = await fetchHotelRates(hotel.id);

    if (rateData?.throttled) {
      throttled++;
      console.log(' throttled — waiting 2s...');
      await sleep(2000);
      // Retry once
      const retry = await fetchHotelRates(hotel.id);
      if (retry?.throttled || !retry) {
        results.push({ ...hotel, status: 'error', error: 'Rate-limited' });
        console.log(' still throttled, skipping');
        checked++;
        continue;
      }
    }

    const analysis = analyseRate(rateData);

    if (!analysis.available) {
      results.push({ ...hotel, status: 'unavailable', cug_rate: null, retail_rate: null, margin: null });
      unavailable++;
      console.log(' unavailable');
    } else if (analysis.margin === null) {
      results.push({ ...hotel, status: 'no_retail_rate', cug_rate: analysis.cug_rate, retail_rate: null, margin: null });
      console.log(` CUG: £${analysis.cug_rate} (no retail rate for comparison)`);
    } else if (analysis.margin < MIN_SAVING) {
      results.push({ ...hotel, status: 'low_margin', ...analysis });
      lowMargin++;
      console.log(` ⚠ LOW ${(analysis.margin * 100).toFixed(1)}% (£${analysis.cug_rate} vs £${analysis.retail_rate})`);
    } else if (analysis.margin > GREAT_SAVING) {
      results.push({ ...hotel, status: 'great_margin', ...analysis });
      greatMargin++;
      console.log(` 🌟 ${(analysis.margin * 100).toFixed(1)}% (£${analysis.cug_rate} vs £${analysis.retail_rate})`);
    } else {
      results.push({ ...hotel, status: 'healthy', ...analysis });
      console.log(` ✓ ${(analysis.margin * 100).toFixed(1)}%`);
    }

    checked++;

    // Rate limit: 200ms between calls
    await sleep(200);
  }

  // Build snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    total_hotels: allHotels.length,
    checked,
    unavailable,
    low_margin: lowMargin,
    great_margin: greatMargin,
    throttled,
    results
  };

  // Write snapshot
  writeJSON(SNAPSHOT_FILE, snapshot);
  console.log(`\n  ✓ Snapshot saved to rate-snapshot.json`);

  // Summary
  console.log(`\n  ── Summary ─────────────────────────────────`);
  console.log(`  Checked:      ${checked}/${allHotels.length}`);
  console.log(`  Unavailable:  ${unavailable}`);
  console.log(`  Low margin:   ${lowMargin} (<${(MIN_SAVING * 100).toFixed(0)}%)`);
  console.log(`  Great margin: ${greatMargin} (>${(GREAT_SAVING * 100).toFixed(0)}%)`);
  console.log(`  Healthy:      ${checked - unavailable - lowMargin - greatMargin}`);
  if (throttled) console.log(`  Throttled:    ${throttled} retries`);

  if (DRY_RUN) {
    console.log(`\n  [DRY RUN] Would create GitHub issue if action needed.`);
    return;
  }

  // Create GitHub issue if action needed
  const actionNeeded = lowMargin > 0 || unavailable > (allHotels.length * ALERT_ZERO_PCT);
  if (actionNeeded && GH_TOKEN && GH_REPO) {
    console.log('\n  Creating rate-monitor issue...');
    try {
      const issueBody = buildIssueBody(snapshot);
      const res = await fetch(`${GH_API}/repos/${GH_REPO}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Rate Monitor: ${lowMargin} low-margin, ${unavailable} unavailable [${new Date().toISOString().slice(0, 10)}]`,
          body: issueBody,
          labels: ['rate-monitor', 'auto-generated']
        })
      });
      if (res.ok) {
        const issue = await res.json();
        console.log(`  ✓ Issue #${issue.number} created.`);
      } else {
        console.log(`  ⚠ Issue creation failed: ${res.status}`);
      }
    } catch (e) {
      console.log(`  ⚠ Issue creation: ${e.message}`);
    }
  } else if (!actionNeeded) {
    console.log('\n  No action needed — all margins healthy.');
  }

  // Log to history
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'observation',
    timestamp: new Date().toISOString(),
    observation: `Rate monitor: ${checked} checked, ${lowMargin} low-margin, ${greatMargin} great-margin, ${unavailable} unavailable`,
    source: 'rate-monitor'
  });
  writeJSON(HISTORY_FILE, history);

  console.log(`\n✅  Rate monitor complete.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
