#!/usr/bin/env node
/**
 * autoresearch/health-check.js
 *
 * Daily health check for all deployed Lite-Stack sites.
 * Checks:
 *   1. Each site's main URL returns HTTP 200
 *   2. At least one SEO page per site returns HTTP 200
 *   3. LiteAPI returns valid hotel results for a test search
 *   4. PostHog snippet is present in at least the main page HTML
 *
 * Exits with code 0 = all healthy, code 1 = failures detected.
 * Outputs a JSON report to stdout (GitHub Actions reads this to create an issue).
 *
 * Usage:
 *   node autoresearch/health-check.js
 */

const fs   = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, '..', 'generator', 'configs');
const LITEAPI_URL = 'https://api.liteapi.travel/v3.0';

const failures = [];
const warnings = [];
const results  = [];

// ── helpers ────────────────────────────────────────────────────
async function checkUrl(url, opts = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return { ok: res.ok, status: res.status, body: opts.body ? await res.text() : null };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function checkLiteApi(apiKey, cityId) {
  const today = new Date();
  const checkin  = new Date(today); checkin.setDate(today.getDate() + 7);
  const checkout = new Date(checkin); checkout.setDate(checkin.getDate() + 2);
  const fmt = d => d.toISOString().slice(0, 10);

  const url = `${LITEAPI_URL}/hotels?cityId=${cityId}&checkin=${fmt(checkin)}&checkout=${fmt(checkout)}&adults=2&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    const count = data?.data?.length || 0;
    return { ok: count > 0, status: res.status, hotelCount: count };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── load all configs ───────────────────────────────────────────
function loadConfigs() {
  return fs.readdirSync(CONFIGS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, f), 'utf8'));
      return { name: path.basename(f, '.json'), cfg };
    });
}

// ── check a single site ────────────────────────────────────────
async function checkSite({ name, cfg }) {
  const siteUrl   = cfg.SCHEMA_URL || `https://${name}.jackthughes99.workers.dev`;
  const brand     = cfg.BRAND_NAME || name;
  const siteResult = { site: name, url: siteUrl, checks: [] };

  console.error(`  Checking ${brand} (${siteUrl})...`);

  // 1. Main page
  const main = await checkUrl(siteUrl, { body: true });
  if (!main.ok) {
    const msg = `Main page down: ${siteUrl} → HTTP ${main.status || 'timeout'} (${main.error || ''})`;
    failures.push(`[${brand}] ${msg}`);
    siteResult.checks.push({ check: 'main_page', ok: false, detail: msg });
  } else {
    siteResult.checks.push({ check: 'main_page', ok: true, status: main.status });

    // 2. PostHog snippet present
    if (main.body && !main.body.includes('posthog')) {
      const msg = `PostHog snippet missing from main page`;
      warnings.push(`[${brand}] ${msg}`);
      siteResult.checks.push({ check: 'posthog_snippet', ok: false, detail: msg });
    } else {
      siteResult.checks.push({ check: 'posthog_snippet', ok: true });
    }
  }

  // 3. First SEO page
  const firstCity = cfg.cities?.[0]?.value;
  if (firstCity) {
    const slug     = firstCity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const pageUrl  = `${siteUrl}/${slug}.html`;
    const seoCheck = await checkUrl(pageUrl);
    if (!seoCheck.ok) {
      const msg = `SEO page down: ${pageUrl} → HTTP ${seoCheck.status || 'timeout'}`;
      failures.push(`[${brand}] ${msg}`);
      siteResult.checks.push({ check: 'seo_page', ok: false, detail: msg });
    } else {
      siteResult.checks.push({ check: 'seo_page', ok: true, url: pageUrl });
    }
  }

  // 4. First region page (if any)
  const firstRegion = cfg.seo_regions?.[0];
  if (firstRegion) {
    const regionUrl   = `${siteUrl}/${firstRegion.slug}.html`;
    const regionCheck = await checkUrl(regionUrl);
    if (!regionCheck.ok) {
      const msg = `Region page down: ${regionUrl} → HTTP ${regionCheck.status || 'timeout'}`;
      failures.push(`[${brand}] ${msg}`);
      siteResult.checks.push({ check: 'region_page', ok: false, detail: msg });
    } else {
      siteResult.checks.push({ check: 'region_page', ok: true, url: regionUrl });
    }
  }

  // 5. Sitemap
  const sitemapCheck = await checkUrl(`${siteUrl}/sitemap.xml`);
  if (!sitemapCheck.ok) {
    warnings.push(`[${brand}] sitemap.xml not accessible (HTTP ${sitemapCheck.status || 'timeout'})`);
    siteResult.checks.push({ check: 'sitemap', ok: false });
  } else {
    siteResult.checks.push({ check: 'sitemap', ok: true });
  }

  results.push(siteResult);
}

// ── LiteAPI check (once, shared across sites) ─────────────────
async function checkLiteAPIOnce(configs) {
  // Find any config with a LiteAPI key and a known city ID
  const LONDON_CITY_ID = 'ChIJdd4hrwug2EcRmSrV3Vo6llI'; // Google Places ID for London

  const apiKey = configs.find(c => c.cfg.LITEAPI_KEY)?.cfg.LITEAPI_KEY;
  if (!apiKey) {
    warnings.push('[LiteAPI] No API key found in any config — skipping availability check');
    return;
  }

  console.error(`  Checking LiteAPI availability...`);
  const check = await checkLiteApi(apiKey, LONDON_CITY_ID);
  if (!check.ok) {
    failures.push(`[LiteAPI] Hotel search failed — HTTP ${check.status || 'error'}: ${check.error || 'no hotels returned'}`);
    results.push({ check: 'liteapi', ok: false, detail: check });
  } else {
    console.error(`  ✓ LiteAPI returned ${check.hotelCount} hotels`);
    results.push({ check: 'liteapi', ok: true, hotelCount: check.hotelCount });
  }
}

// ── main ───────────────────────────────────────────────────────
async function main() {
  console.error('\n🔍  Lite-Stack health check starting...\n');

  const configs = loadConfigs();
  console.error(`  Loaded ${configs.length} site configs\n`);

  await checkLiteAPIOnce(configs);

  for (const site of configs) {
    await checkSite(site);
  }

  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    status:   failures.length === 0 ? 'healthy' : 'degraded',
    failures,
    warnings,
    results
  };

  // Always print the JSON report so the workflow can read it
  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    console.error(`\n❌  ${failures.length} failure(s) detected:\n`);
    failures.forEach(f => console.error(`   • ${f}`));
    if (warnings.length) {
      console.error(`\n⚠️  ${warnings.length} warning(s):\n`);
      warnings.forEach(w => console.error(`   • ${w}`));
    }
    process.exit(1);
  } else {
    console.error(`\n✅  All ${configs.length} sites healthy`);
    if (warnings.length) {
      console.error(`\n⚠️  ${warnings.length} warning(s):\n`);
      warnings.forEach(w => console.error(`   • ${w}`));
    }
    process.exit(0);
  }
}

main().catch(e => {
  console.error('❌ Health check crashed:', e.message);
  process.exit(1);
});
