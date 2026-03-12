#!/usr/bin/env node
/**
 * deploy-all.js
 *
 * Runs on every push via GitHub Actions.
 * For each config in generator/configs/:
 *   1. Generates the site (node generator/generate.js <name>)
 *   2. Injects PostHog key
 *   3. Creates the Netlify site if it doesn't exist yet
 *   4. Deploys to production
 *
 * Required env vars:
 *   NETLIFY_AUTH_TOKEN  — Netlify personal access token
 *   POSTHOG_PROJECT_KEY — PostHog project API key
 */

const fs    = require('fs');
const path  = require('path');
const { execSync } = require('child_process');

const AUTH_TOKEN      = process.env.NETLIFY_AUTH_TOKEN;
const POSTHOG_KEY     = process.env.POSTHOG_PROJECT_KEY || '';
const CONFIGS_DIR     = path.join(__dirname, 'generator', 'configs');
const SITES_DIR       = path.join(__dirname, 'sites');
const NETLIFY_API     = 'https://api.netlify.com/api/v1';

if (!AUTH_TOKEN) {
  console.error('❌  NETLIFY_AUTH_TOKEN is not set');
  process.exit(1);
}

// ── Netlify API helpers ────────────────────────────────────────
async function apiGet(endpoint) {
  const res = await fetch(`${NETLIFY_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  });
  if (!res.ok) throw new Error(`GET ${endpoint} → ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${NETLIFY_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Get or create a Netlify site by name ──────────────────────
async function getOrCreateSite(name) {
  const sites = await apiGet('/sites');
  const existing = sites.find(s => s.name === name);
  if (existing) {
    console.log(`  ✓ Site exists: ${name} (${existing.id})`);
    return existing;
  }

  console.log(`  + Creating site: ${name}`);
  const site = await apiPost('/sites', { name });
  console.log(`  ✓ Created: ${name} → ${site.ssl_url || site.url}`);
  return site;
}

// ── Set an env var on a site ──────────────────────────────────
async function setEnvVar(siteId, key, value) {
  await fetch(`${NETLIFY_API}/sites/${siteId}/env`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ [key]: value })
  });
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const allConfigs = fs.readdirSync(CONFIGS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'));

  // Skip configs with skip_deploy: true
  const configs = allConfigs.filter(name => {
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, `${name}.json`), 'utf8'));
    if (cfg.skip_deploy) {
      console.log(`  ⏭  Skipping ${name} (skip_deploy: true)`);
      return false;
    }
    return true;
  });

  console.log(`\n🚀  Deploying ${configs.length} site(s): ${configs.join(', ')}\n`);

  for (const name of configs) {
    console.log(`\n── ${name} ──────────────────────────`);
    const cfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, `${name}.json`), 'utf8'));

    // 1. Generate
    console.log(`  Generating...`);
    execSync(`node generator/generate.js ${name}`, { stdio: 'inherit' });

    // 2. Inject PostHog key
    const htmlPath = path.join(SITES_DIR, name, 'index.html');
    if (POSTHOG_KEY) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.split('YOUR_POSTHOG_KEY').join(POSTHOG_KEY);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`  ✓ PostHog key injected`);
    } else {
      console.warn(`  ⚠  POSTHOG_PROJECT_KEY not set — skipping key injection`);
    }

    // 3. Get or create Netlify site
    const site = await getOrCreateSite(name);

    // 4. Set LITEAPI_KEY as server-side env var (never in HTML)
    if (cfg.LITEAPI_KEY) {
      try {
        await setEnvVar(site.id, 'LITEAPI_KEY', cfg.LITEAPI_KEY);
        console.log(`  ✓ LITEAPI_KEY set as env var on ${name}`);
      } catch (e) {
        console.warn(`  ⚠  Could not set LITEAPI_KEY env var: ${e.message}`);
      }
    } else {
      console.warn(`  ⚠  No LITEAPI_KEY in config for ${name} — function will return 500`);
    }

    // 5. Deploy (Netlify CLI — no build step needed, files already generated)
    console.log(`  Deploying to Netlify...`);
    execSync(
      `netlify deploy --dir=sites/${name} --prod --site=${site.id} --auth=${AUTH_TOKEN}`,
      { stdio: 'inherit' }
    );

    console.log(`  ✅  ${name} → ${site.ssl_url || site.url}`);
  }

  console.log(`\n✅  All sites deployed.\n`);
}

main().catch(err => {
  console.error('❌ ', err.message);
  process.exit(1);
});
