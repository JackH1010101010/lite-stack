#!/usr/bin/env node
/**
 * autoresearch/evolve.js
 *
 * The autoresearch loop for the LuxStay portfolio.
 *
 * What it does:
 *   1. Loads a base config (e.g. maldives-escape)
 *   2. Calls Claude API to generate N copy variants (headlines, CTAs, editorial, FAQs)
 *   3. Writes each as a new config file: <name>-v1, <name>-v2 ...
 *   4. Deploys each variant via the existing deploy pipeline
 *   5. Writes a tracking file (experiments.json) with variant URLs + start time
 *   6. (Measurement) After --measure flag: queries PostHog, picks winner, updates base config
 *
 * Usage:
 *   node autoresearch/evolve.js --site maldives-escape --variants 3
 *   node autoresearch/evolve.js --site maldives-escape --measure   (after 48-72h)
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY   — from console.anthropic.com
 *   NETLIFY_AUTH_TOKEN  — Netlify personal access token
 *   POSTHOG_PROJECT_KEY — PostHog project API key
 *   POSTHOG_PERSONAL_KEY — PostHog personal API key (for reading data, not writing)
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const CONFIGS_DIR     = path.join(__dirname, '..', 'generator', 'configs');
const EXPERIMENTS_FILE = path.join(__dirname, 'experiments.json');
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const NETLIFY_TOKEN   = process.env.NETLIFY_AUTH_TOKEN;
const POSTHOG_KEY     = process.env.POSTHOG_PROJECT_KEY || '';
const POSTHOG_PERSONAL = process.env.POSTHOG_PERSONAL_KEY;
const NETLIFY_API     = 'https://api.netlify.com/api/v1';
const ANTHROPIC_API   = 'https://api.anthropic.com/v1/messages';

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i+1] ? args[i+1] : def;
};
const MODE    = args.includes('--measure') ? 'measure' : 'generate';
const SITE    = getArg('--site', null);
const N       = parseInt(getArg('--variants', '3'), 10);

if (!SITE) {
  console.error('Usage: node autoresearch/evolve.js --site <name> [--variants 3] [--measure]');
  process.exit(1);
}

// ── Anthropic API call ────────────────────────────────────────
async function callClaude(prompt) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Generate copy variants ────────────────────────────────────
async function generateVariants(baseCfg, n) {
  const prompt = `You are a conversion rate optimisation expert for a luxury hotel booking site.

Here is the current site config (JSON). Generate ${n} alternative versions of the COPY fields only.
Do NOT change: colors, hotel data, cities, API keys, form names, Google client ID, or any technical fields.
Only vary: HERO_EYEBROW, HERO_H1, HERO_SUB, MODAL_HEADLINE, MODAL_SUB, MODAL_SUCCESS_TEXT, FOOTER_TAGLINE,
and the editorial title + paragraphs, and FAQ q+a text.

Rules for variants:
- Each variant must have a meaningfully different angle or emphasis (urgency, exclusivity, saving amount, experience, FOMO)
- Keep the same factual claims — don't invent savings percentages that aren't in the original
- Keep the same cities/destinations
- HERO_H1 should be a single punchy line under 12 words
- Return ONLY a JSON array of ${n} objects, each containing ONLY the copy fields that differ from the base
- No markdown, no commentary, just raw JSON array

Base config (copy fields only):
${JSON.stringify({
  HERO_EYEBROW: baseCfg.HERO_EYEBROW,
  HERO_H1: baseCfg.HERO_H1,
  HERO_SUB: baseCfg.HERO_SUB,
  MODAL_HEADLINE: baseCfg.MODAL_HEADLINE,
  MODAL_SUB: baseCfg.MODAL_SUB,
  MODAL_SUCCESS_TEXT: baseCfg.MODAL_SUCCESS_TEXT,
  FOOTER_TAGLINE: baseCfg.FOOTER_TAGLINE,
  editorial: baseCfg.editorial,
  faq_items: baseCfg.faq_items
}, null, 2)}

Return JSON array only:`;

  const raw = await callClaude(prompt);

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude did not return a JSON array:\n' + raw);
  return JSON.parse(match[0]);
}

// ── Netlify: get or create site ───────────────────────────────
async function getOrCreateNetlifySite(name) {
  const res = await fetch(`${NETLIFY_API}/sites`, {
    headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` }
  });
  const sites = await res.json();
  const existing = sites.find(s => s.name === name);
  if (existing) return existing;

  const create = await fetch(`${NETLIFY_API}/sites`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${NETLIFY_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return create.json();
}

// ── Deploy a config ───────────────────────────────────────────
async function deployVariant(configName) {
  // Generate the site
  execSync(`node generator/generate.js ${configName}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Inject PostHog key
  const htmlPath = path.join(__dirname, '..', 'sites', configName, 'index.html');
  if (POSTHOG_KEY) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.split('YOUR_POSTHOG_KEY').join(POSTHOG_KEY);
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  // Get/create Netlify site
  const site = await getOrCreateNetlifySite(configName);

  // Deploy
  execSync(
    `netlify deploy --dir=sites/${configName} --prod --site=${site.id} --auth=${NETLIFY_TOKEN}`,
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  );

  return site.ssl_url || `https://${configName}.netlify.app`;
}

// ── PostHog: get member_joined count for a site ───────────────
async function getConversions(siteUrl, fromDate) {
  if (!POSTHOG_PERSONAL) {
    console.warn('  POSTHOG_PERSONAL_KEY not set — skipping measurement');
    return null;
  }
  // PostHog events API — filter by $current_url containing site URL
  const from = fromDate || new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10);
  const res = await fetch(
    `https://app.posthog.com/api/projects/@current/events/?event=member_joined&properties=[{"key":"$current_url","value":"${siteUrl}","operator":"icontains"}]&after=${from}`,
    { headers: { Authorization: `Bearer ${POSTHOG_PERSONAL}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.count || (data.results ? data.results.length : 0);
}

// ── GENERATE MODE ─────────────────────────────────────────────
async function runGenerate() {
  console.log(`\n🧬  Autoresearch: generating ${N} variants of ${SITE}\n`);

  if (!ANTHROPIC_KEY) {
    console.error('❌  ANTHROPIC_API_KEY not set. Get one at console.anthropic.com');
    process.exit(1);
  }

  // Load base config
  const basePath = path.join(CONFIGS_DIR, `${SITE}.json`);
  if (!fs.existsSync(basePath)) {
    console.error(`Config not found: ${basePath}`);
    process.exit(1);
  }
  const baseCfg = JSON.parse(fs.readFileSync(basePath, 'utf8'));

  // Generate variants via Claude
  console.log('  Calling Claude to generate copy variants...');
  let variants;
  try {
    variants = await generateVariants(baseCfg, N);
    console.log(`  ✓ Got ${variants.length} variants`);
  } catch(e) {
    console.error('  ❌ Variant generation failed:', e.message);
    process.exit(1);
  }

  // Write variant configs + deploy
  const experiments = {
    base_site: SITE,
    started_at: new Date().toISOString(),
    variants: [
      { name: SITE, label: 'control', url: null, conversions: null }
    ]
  };

  // Deploy control (base site) first
  console.log(`\n  Deploying control: ${SITE}`);
  try {
    const url = await deployVariant(SITE);
    experiments.variants[0].url = url;
    console.log(`  ✓ Control live: ${url}`);
  } catch(e) {
    console.error('  ❌ Control deploy failed:', e.message);
  }

  // Deploy each variant
  for (let i = 0; i < variants.length; i++) {
    const variantCfg = { ...baseCfg, ...variants[i], skip_deploy: false };
    const variantName = `${SITE}-v${i + 1}`;
    variantCfg.BRAND_NAME = variantCfg.BRAND_NAME; // keep original brand name
    variantCfg.SCHEMA_URL = `https://${variantName}.netlify.app`;

    const variantPath = path.join(CONFIGS_DIR, `${variantName}.json`);
    fs.writeFileSync(variantPath, JSON.stringify(variantCfg, null, 2), 'utf8');
    console.log(`\n  Deploying variant ${i+1}: ${variantName}`);
    console.log(`  Headline: "${variants[i].HERO_H1 || '(unchanged)'}"`);

    try {
      const url = await deployVariant(variantName);
      experiments.variants.push({ name: variantName, label: `v${i+1}`, url, conversions: null });
      console.log(`  ✓ Live: ${url}`);
    } catch(e) {
      console.error(`  ❌ Deploy failed for ${variantName}:`, e.message);
    }
  }

  // Save tracking file
  fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(experiments, null, 2), 'utf8');
  console.log(`\n✅  Experiment started. Tracking file: autoresearch/experiments.json`);
  console.log(`\n   Run after 48-72h to measure results:`);
  console.log(`   node autoresearch/evolve.js --site ${SITE} --measure\n`);
}

// ── MEASURE MODE ──────────────────────────────────────────────
async function runMeasure() {
  console.log(`\n📊  Measuring experiment results for ${SITE}\n`);

  if (!fs.existsSync(EXPERIMENTS_FILE)) {
    console.error('No experiments.json found. Run --generate first.');
    process.exit(1);
  }

  const experiments = JSON.parse(fs.readFileSync(EXPERIMENTS_FILE, 'utf8'));
  if (experiments.base_site !== SITE) {
    console.error(`experiments.json is for ${experiments.base_site}, not ${SITE}`);
    process.exit(1);
  }

  const fromDate = experiments.started_at.slice(0,10);
  console.log(`  Measuring from ${fromDate}...\n`);

  // Fetch conversion counts
  for (const v of experiments.variants) {
    if (!v.url) { v.conversions = 0; continue; }
    const count = await getConversions(v.url, fromDate);
    v.conversions = count;
    console.log(`  ${v.label.padEnd(10)} ${v.url}`);
    console.log(`             conversions: ${count ?? 'n/a (no PostHog key)'}`);
  }

  // Pick winner
  const withData = experiments.variants.filter(v => v.conversions !== null);
  if (withData.length === 0) {
    console.log('\n  No conversion data available yet. Try again later or set POSTHOG_PERSONAL_KEY.');
    return;
  }

  const winner = withData.reduce((a, b) => (b.conversions > a.conversions ? b : a));
  console.log(`\n  🏆  Winner: ${winner.label} (${winner.conversions} conversions)`);
  console.log(`      ${winner.url}`);

  if (winner.name !== SITE) {
    // Apply winning copy back to base config
    const winnerCfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, `${winner.name}.json`), 'utf8'));
    const baseCfg   = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, `${SITE}.json`), 'utf8'));

    const copyFields = ['HERO_EYEBROW','HERO_H1','HERO_SUB','MODAL_HEADLINE','MODAL_SUB',
                        'MODAL_SUCCESS_TEXT','FOOTER_TAGLINE','editorial','faq_items'];
    let changed = false;
    for (const field of copyFields) {
      if (winnerCfg[field] && JSON.stringify(winnerCfg[field]) !== JSON.stringify(baseCfg[field])) {
        baseCfg[field] = winnerCfg[field];
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(path.join(CONFIGS_DIR, `${SITE}.json`), JSON.stringify(baseCfg, null, 2), 'utf8');
      console.log(`\n  ✓ Winning copy applied to ${SITE}.json`);
      console.log(`    Commit and push to deploy the improved site.`);
    } else {
      console.log('\n  Control was already optimal — no changes made.');
    }
  } else {
    console.log('\n  Control won — no changes to base config.');
  }

  // Mark experiment complete
  experiments.completed_at = new Date().toISOString();
  experiments.winner = winner.label;
  fs.writeFileSync(EXPERIMENTS_FILE, JSON.stringify(experiments, null, 2), 'utf8');

  // Clean up variant configs (optional — leave them for reference)
  console.log('\n  Variant configs kept in generator/configs/ for reference.');
  console.log('  Delete <site>-v*.json files when done.\n');
}

// ── Run ───────────────────────────────────────────────────────
if (MODE === 'measure') {
  runMeasure().catch(e => { console.error('❌', e.message); process.exit(1); });
} else {
  runGenerate().catch(e => { console.error('❌', e.message); process.exit(1); });
}
