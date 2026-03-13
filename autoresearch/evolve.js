#!/usr/bin/env node
/**
 * autoresearch/evolve.js  (v3 — Cloudflare Workers)
 *
 * The copy A/B testing engine for the Lite-Stack portfolio.
 *
 * Deploys variant sites to Cloudflare Workers via wrangler. Each variant
 * gets its own Worker (<site>-v1, <site>-v2, etc.) with the shared
 * worker.js entry point and a per-variant static assets directory.
 *
 * Features:
 *   - experiments.json is an ARRAY (supports parallel experiments on different sites)
 *   - Each experiment has: status, hypothesis, measure_after, canary_until fields
 *   - History integration: reads last 10 entries when generating, appends results when measuring
 *   - Measurement window: 7 days
 *   - Canary period: 7 days after measurement before promotion
 *   - Chi-squared statistical significance flag
 *   - Cloudflare Worker cleanup on promotion
 *
 * Usage:
 *   node autoresearch/evolve.js --site maldives-escape --variants 3
 *   node autoresearch/evolve.js --site maldives-escape --measure
 *   node autoresearch/evolve.js --site maldives-escape --promote   (after canary)
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY      — from console.anthropic.com
 *   CLOUDFLARE_API_TOKEN   — Cloudflare API token with Workers write permission
 *   CLOUDFLARE_ACCOUNT_ID  — Cloudflare account ID
 *   POSTHOG_PROJECT_KEY    — PostHog project API key
 *   POSTHOG_PERSONAL_KEY   — PostHog personal API key (for reading data)
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const CONFIGS_DIR      = path.join(__dirname, '..', 'generator', 'configs');
const EXPERIMENTS_FILE = path.join(__dirname, 'experiments.json');
const HISTORY_FILE     = path.join(__dirname, 'history.json');
const ROOT             = path.join(__dirname, '..');
const WORKER_FILE      = path.join(ROOT, 'worker.js');
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY;
const CF_API_TOKEN     = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID    = process.env.CLOUDFLARE_ACCOUNT_ID;
const POSTHOG_KEY      = process.env.POSTHOG_PROJECT_KEY || '';
const POSTHOG_PERSONAL = process.env.POSTHOG_PERSONAL_KEY;
const ANTHROPIC_API    = 'https://api.anthropic.com/v1/messages';
const CF_API           = 'https://api.cloudflare.com/client/v4';

const { evalVariants } = require('./eval-variants');

const MEASUREMENT_WINDOW_DAYS = 7;
const CANARY_WINDOW_DAYS      = 7;

// ── CLI args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i+1] ? args[i+1] : def;
};

const SITE = getArg('--site', null);
const N    = parseInt(getArg('--variants', '3'), 10);
let MODE   = 'generate';
if (args.includes('--measure')) MODE = 'measure';
if (args.includes('--promote')) MODE = 'promote';

if (!SITE) {
  console.error('Usage: node autoresearch/evolve.js --site <name> [--variants 3] [--measure] [--promote]');
  process.exit(1);
}

// ── File helpers ──────────────────────────────────────────────
function readJSON(filepath, fallback) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadExperiments() {
  const data = readJSON(EXPERIMENTS_FILE, []);
  // Migrate from v1 single-object format if needed
  if (!Array.isArray(data)) return [data];
  return data;
}

function saveExperiments(exps) { writeJSON(EXPERIMENTS_FILE, exps); }
function loadHistory() { return readJSON(HISTORY_FILE, []); }
function saveHistory(h) { writeJSON(HISTORY_FILE, h); }

function findExperiment(exps, site, statuses) {
  return exps.find(e => e.site === site && statuses.includes(e.status));
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

// ── Generate copy variants (with history context) ─────────────
async function generateVariants(baseCfg, n) {
  // Load recent history for context
  const history = loadHistory();
  const recent = history
    .filter(h => h.type === 'experiment' && h.experiment_type === 'copy_test')
    .slice(-10);

  const historyContext = recent.length > 0
    ? `\nPrevious experiment results (avoid repeating failed angles):\n${recent.map(h =>
        `- Site: ${h.site}, Hypothesis: "${h.hypothesis}", Winner: ${h.winner}, Lift: ${h.lift}, Significant: ${h.statistically_significant}`
      ).join('\n')}\n`
    : '';

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
- For each variant, include a "hypothesis" field explaining the angle (1 sentence)
- Return ONLY a JSON array of ${n} objects, each containing the copy fields that differ from the base PLUS a "hypothesis" string
- No markdown, no commentary, just raw JSON array
${historyContext}
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
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude did not return a JSON array:\n' + raw);
  return JSON.parse(match[0]);
}

// ── Cloudflare Workers helpers ───────────────────────────────

/**
 * Write a temporary wrangler.toml for deploying a specific site as a Worker.
 * Returns the URL the Worker will be available at.
 */
function writeTempWranglerToml(name) {
  const content = `# Auto-generated by evolve.js for ${name}
name = "${name}"
main = "worker.js"
compatibility_date = "2024-09-23"
account_id = "${CF_ACCOUNT_ID}"

[assets]
directory = "sites/${name}"
`;
  const tomlPath = path.join(ROOT, 'wrangler.toml');
  fs.writeFileSync(tomlPath, content, 'utf8');
  return `https://${name}.${CF_ACCOUNT_ID.slice(0, 8)}.workers.dev`;
}

/**
 * Delete a Cloudflare Worker by name via the API.
 */
async function deleteCloudflareWorker(name) {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) return;
  try {
    const res = await fetch(
      `${CF_API}/accounts/${CF_ACCOUNT_ID}/workers/scripts/${name}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
      }
    );
    if (res.ok) {
      console.log(`  ✓ Deleted Cloudflare Worker: ${name}`);
    } else if (res.status === 404) {
      console.log(`  ⏭ Worker ${name} not found (already deleted)`);
    } else {
      console.warn(`  ⚠ Could not delete Worker ${name}: ${res.status}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Could not delete Worker ${name}: ${e.message}`);
  }
}

// ── Deploy a config via wrangler ─────────────────────────────
async function deployVariant(configName) {
  execSync(`node generator/generate.js ${configName}`, {
    stdio: 'inherit',
    cwd: ROOT
  });

  const htmlPath = path.join(ROOT, 'sites', configName, 'index.html');
  if (POSTHOG_KEY) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.split('YOUR_POSTHOG_KEY').join(POSTHOG_KEY);
    fs.writeFileSync(htmlPath, html, 'utf8');
  }

  // Write per-site wrangler.toml and deploy via wrangler
  writeTempWranglerToml(configName);
  execSync('npx wrangler deploy', { stdio: 'inherit', cwd: ROOT });

  return `https://${configName}.jackthughes99.workers.dev`;
}

// ── PostHog: get conversion + visitor counts ─────────────────
async function getConversions(siteUrl, fromDate) {
  if (!POSTHOG_PERSONAL) {
    console.warn('  POSTHOG_PERSONAL_KEY not set — skipping measurement');
    return { conversions: null, visitors: null };
  }

  const from = fromDate || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // Get member_joined events
  const convRes = await fetch(
    `https://us.i.posthog.com/api/projects/@current/events/?event=member_joined&properties=[{"key":"$current_url","value":"${siteUrl}","operator":"icontains"}]&after=${from}`,
    { headers: { Authorization: `Bearer ${POSTHOG_PERSONAL}` } }
  );
  const convData = convRes.ok ? await convRes.json() : { results: [] };
  const conversions = convData.count || (convData.results ? convData.results.length : 0);

  // Get pageview events for visitor count
  const pvRes = await fetch(
    `https://us.i.posthog.com/api/projects/@current/events/?event=$pageview&properties=[{"key":"$current_url","value":"${siteUrl}","operator":"icontains"}]&after=${from}`,
    { headers: { Authorization: `Bearer ${POSTHOG_PERSONAL}` } }
  );
  const pvData = pvRes.ok ? await pvRes.json() : { results: [] };
  const visitors = pvData.count || (pvData.results ? pvData.results.length : 0);

  return { conversions, visitors };
}

// ── Chi-squared significance test ────────────────────────────
function chiSquaredTest(variants) {
  // Simple 2×k chi-squared test for independence
  const totalConv = variants.reduce((s, v) => s + (v.conversions || 0), 0);
  const totalVis  = variants.reduce((s, v) => s + (v.visitors || 0), 0);
  if (totalConv === 0 || totalVis === 0) return false;

  let chiSq = 0;
  for (const v of variants) {
    const obs = v.conversions || 0;
    const vis = v.visitors || 1;
    const expected = (totalConv / totalVis) * vis;
    if (expected > 0) {
      chiSq += Math.pow(obs - expected, 2) / expected;
    }
  }

  // df = k-1; for 4 variants df=3. Critical value at p<0.05: 7.815
  const df = variants.length - 1;
  const criticalValues = { 1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488 };
  const critical = criticalValues[df] || 7.815;

  return chiSq > critical;
}

// ── GENERATE MODE ────────────────────────────────────────────
async function runGenerate() {
  console.log(`\n🧬  Autoresearch: generating ${N} variants of ${SITE}\n`);

  if (!ANTHROPIC_KEY) {
    console.error('❌  ANTHROPIC_API_KEY not set. Get one at console.anthropic.com');
    process.exit(1);
  }

  // Check for existing running experiment on this site
  const experiments = loadExperiments();
  const active = findExperiment(experiments, SITE, ['running', 'canary']);
  if (active) {
    console.error(`❌  Active experiment already running on ${SITE} (status: ${active.status})`);
    console.error(`   Measure or promote it first before starting a new one.`);
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
  } catch (e) {
    console.error('  ❌ Variant generation failed:', e.message);
    process.exit(1);
  }

  // ── Quality gate: eval-variants check before deployment ────
  console.log('\n  Running quality gate on generated variants...');
  try {
    const variantsForEval = variants.map(v => {
      const { hypothesis, ...copyFields } = v;
      return copyFields;
    });
    const evalResult = await evalVariants(variantsForEval, { type: 'copy', siteName: SITE });

    if (!evalResult.gate_pass) {
      console.error(`  ❌ Quality gate FAILED: ${evalResult.failed}/${evalResult.total} variants rejected.`);
      for (const r of evalResult.results) {
        if (!r.pass) {
          console.error(`     Variant ${r.index + 1}: ${r.issues.join('; ')}`);
        }
      }
      // Filter to only passing variants
      const passingIndices = evalResult.results.filter(r => r.pass).map(r => r.index);
      if (passingIndices.length === 0) {
        console.error('  ❌ No variants passed quality gate. Aborting experiment.');
        process.exit(1);
      }
      variants = passingIndices.map(i => variants[i]);
      console.log(`  ⚠ Continuing with ${variants.length} passing variant(s).`);
    } else {
      console.log(`  ✓ Quality gate passed: ${evalResult.passed}/${evalResult.total} variants OK`);
      if (evalResult.results.some(r => r.warnings.length > 0)) {
        for (const r of evalResult.results) {
          r.warnings.forEach(w => console.log(`    ⚠ Variant ${r.index + 1}: ${w}`));
        }
      }
    }
  } catch (e) {
    console.warn(`  ⚠ Quality gate skipped (${e.message}) — proceeding without eval.`);
  }

  // Build experiment entry
  const now = new Date();
  const measureAfter = new Date(now.getTime() + MEASUREMENT_WINDOW_DAYS * 86400000);
  const hypotheses = variants.map(v => v.hypothesis || 'No hypothesis provided');

  const experiment = {
    id: `exp-${now.toISOString().slice(0,10)}-copy-${SITE}`,
    experiment_type: 'copy_test',
    site: SITE,
    status: 'running',
    hypothesis: hypotheses.join(' | '),
    started_at: now.toISOString(),
    measure_after: measureAfter.toISOString(),
    variants: [
      { name: SITE, label: 'control', url: null, conversions: null, visitors: null }
    ]
  };

  // Deploy control
  console.log(`\n  Deploying control: ${SITE}`);
  try {
    const url = await deployVariant(SITE);
    experiment.variants[0].url = url;
    console.log(`  ✓ Control live: ${url}`);
  } catch (e) {
    console.error('  ❌ Control deploy failed:', e.message);
  }

  // Deploy each variant
  for (let i = 0; i < variants.length; i++) {
    const { hypothesis, ...copyFields } = variants[i];
    const variantCfg = { ...baseCfg, ...copyFields, skip_deploy: false };
    const variantName = `${SITE}-v${i + 1}`;
    variantCfg.SCHEMA_URL = `https://${variantName}.jackthughes99.workers.dev`;

    const variantPath = path.join(CONFIGS_DIR, `${variantName}.json`);
    fs.writeFileSync(variantPath, JSON.stringify(variantCfg, null, 2), 'utf8');
    console.log(`\n  Deploying variant ${i + 1}: ${variantName}`);
    console.log(`  Hypothesis: "${hypothesis || '(none)'}"`);
    console.log(`  Headline: "${copyFields.HERO_H1 || '(unchanged)'}"`);

    try {
      const url = await deployVariant(variantName);
      experiment.variants.push({
        name: variantName,
        label: `v${i + 1}`,
        url,
        hypothesis: hypothesis || '',
        conversions: null,
        visitors: null
      });
      console.log(`  ✓ Live: ${url}`);
    } catch (e) {
      console.error(`  ❌ Deploy failed for ${variantName}:`, e.message);
    }
  }

  // Save experiment
  experiments.push(experiment);
  saveExperiments(experiments);

  console.log(`\n✅  Experiment started: ${experiment.id}`);
  console.log(`   Status: running`);
  console.log(`   Measure after: ${measureAfter.toISOString().slice(0, 10)}`);
  console.log(`\n   The orchestrator will auto-measure on Wednesday.`);
  console.log(`   Or manually: node autoresearch/evolve.js --site ${SITE} --measure\n`);
}

// ── MEASURE MODE ─────────────────────────────────────────────
async function runMeasure() {
  console.log(`\n📊  Measuring experiment for ${SITE}\n`);

  const experiments = loadExperiments();
  const exp = findExperiment(experiments, SITE, ['running']);
  if (!exp) {
    console.error(`No running experiment found for ${SITE}`);
    process.exit(1);
  }

  // Check measurement window
  const measureAfter = new Date(exp.measure_after);
  const now = new Date();
  if (now < measureAfter) {
    const daysLeft = Math.ceil((measureAfter - now) / 86400000);
    console.log(`  ⏳ Measurement window not reached. ${daysLeft} day(s) remaining.`);
    console.log(`     Measure after: ${exp.measure_after}`);
    if (!args.includes('--force')) {
      console.log(`     Use --force to measure early.\n`);
      return;
    }
    console.log(`     --force flag set, measuring anyway.\n`);
  }

  const fromDate = exp.started_at.slice(0, 10);
  console.log(`  Measuring from ${fromDate}...\n`);

  // Fetch conversion + visitor counts
  for (const v of exp.variants) {
    if (!v.url) { v.conversions = 0; v.visitors = 0; continue; }
    const { conversions, visitors } = await getConversions(v.url, fromDate);
    v.conversions = conversions;
    v.visitors = visitors;
    const rate = visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0.00';
    console.log(`  ${v.label.padEnd(10)} ${v.url}`);
    console.log(`             visitors: ${visitors ?? 'n/a'}, conversions: ${conversions ?? 'n/a'}, rate: ${rate}%`);
  }

  // Statistical significance
  const withData = exp.variants.filter(v => v.conversions !== null && v.visitors !== null);
  if (withData.length === 0) {
    console.log('\n  No data available. Try again later or set POSTHOG_PERSONAL_KEY.');
    return;
  }

  const significant = chiSquaredTest(withData);
  const totalSample = withData.reduce((s, v) => s + (v.visitors || 0), 0);

  // Pick winner by conversion rate
  const winner = withData.reduce((best, v) => {
    const bestRate = best.visitors > 0 ? best.conversions / best.visitors : 0;
    const vRate = v.visitors > 0 ? v.conversions / v.visitors : 0;
    return vRate > bestRate ? v : best;
  });

  const controlRate = exp.variants[0].visitors > 0
    ? exp.variants[0].conversions / exp.variants[0].visitors
    : 0;
  const winnerRate = winner.visitors > 0 ? winner.conversions / winner.visitors : 0;
  const liftPct = controlRate > 0 ? (((winnerRate - controlRate) / controlRate) * 100).toFixed(1) : 'n/a';

  console.log(`\n  🏆  Winner: ${winner.label} (rate: ${(winnerRate * 100).toFixed(2)}%)`);
  console.log(`      Lift vs control: ${liftPct}%`);
  console.log(`      Statistically significant: ${significant}`);
  console.log(`      Total sample: ${totalSample} visitors`);

  // Update experiment status → canary
  const canaryUntil = new Date(now.getTime() + CANARY_WINDOW_DAYS * 86400000);
  exp.status = 'canary';
  exp.measured_at = now.toISOString();
  exp.canary_until = canaryUntil.toISOString();
  exp.winner = winner.label;
  exp.lift = `${liftPct}% (${winner.conversions} conv / ${winner.visitors} vis vs control ${exp.variants[0].conversions}/${exp.variants[0].visitors})`;
  exp.statistically_significant = significant;
  exp.sample_size = totalSample;
  saveExperiments(experiments);

  // Append to history
  const history = loadHistory();
  history.push({
    type: 'experiment',
    experiment_type: 'copy_test',
    id: exp.id,
    site: exp.site,
    hypothesis: exp.hypothesis,
    variants: exp.variants.map(v => ({
      label: v.label,
      conversions: v.conversions,
      visitors: v.visitors,
      rate: v.visitors > 0 ? (v.conversions / v.visitors * 100).toFixed(2) + '%' : '0%'
    })),
    winner: exp.winner,
    lift: exp.lift,
    sample_size: totalSample,
    statistically_significant: significant,
    status: 'canary',
    canary_until: canaryUntil.toISOString(),
    measured_at: now.toISOString()
  });
  saveHistory(history);

  console.log(`\n  Status → canary (until ${canaryUntil.toISOString().slice(0, 10)})`);
  console.log(`  Canary period: ${CANARY_WINDOW_DAYS} days`);
  console.log(`\n  The orchestrator will auto-promote on the next Wednesday after canary.`);
  console.log(`  Or manually: node autoresearch/evolve.js --site ${SITE} --promote\n`);
}

// ── PROMOTE MODE ─────────────────────────────────────────────
async function runPromote() {
  console.log(`\n🚀  Promoting canary winner for ${SITE}\n`);

  const experiments = loadExperiments();
  const exp = findExperiment(experiments, SITE, ['canary']);
  if (!exp) {
    console.error(`No canary experiment found for ${SITE}`);
    process.exit(1);
  }

  // Check canary window
  const canaryUntil = new Date(exp.canary_until);
  const now = new Date();
  if (now < canaryUntil && !args.includes('--force')) {
    const daysLeft = Math.ceil((canaryUntil - now) / 86400000);
    console.log(`  ⏳ Canary period not complete. ${daysLeft} day(s) remaining.`);
    console.log(`     Use --force to promote early.\n`);
    return;
  }

  const winnerVariant = exp.variants.find(v => v.label === exp.winner);
  if (!winnerVariant || winnerVariant.label === 'control') {
    console.log('  Control won — no config changes needed.');
    exp.status = 'complete';
    saveExperiments(experiments);
    await cleanupVariants(exp);
    return;
  }

  // Apply winning copy to base config
  const winnerCfgPath = path.join(CONFIGS_DIR, `${winnerVariant.name}.json`);
  if (!fs.existsSync(winnerCfgPath)) {
    console.error(`Winner config not found: ${winnerCfgPath}`);
    process.exit(1);
  }

  const winnerCfg = JSON.parse(fs.readFileSync(winnerCfgPath, 'utf8'));
  const baseCfg = JSON.parse(fs.readFileSync(path.join(CONFIGS_DIR, `${SITE}.json`), 'utf8'));

  const copyFields = [
    'HERO_EYEBROW', 'HERO_H1', 'HERO_SUB', 'MODAL_HEADLINE', 'MODAL_SUB',
    'MODAL_SUCCESS_TEXT', 'FOOTER_TAGLINE', 'editorial', 'faq_items'
  ];

  let changed = false;
  for (const field of copyFields) {
    if (winnerCfg[field] && JSON.stringify(winnerCfg[field]) !== JSON.stringify(baseCfg[field])) {
      baseCfg[field] = winnerCfg[field];
      changed = true;
    }
  }

  if (changed) {
    writeJSON(path.join(CONFIGS_DIR, `${SITE}.json`), baseCfg);
    console.log(`  ✓ Winning copy applied to ${SITE}.json`);
  } else {
    console.log('  No copy differences found (control was optimal).');
  }

  // Update status
  exp.status = 'promoted';
  exp.promoted_at = now.toISOString();
  saveExperiments(experiments);

  // Update history
  const history = loadHistory();
  const historyEntry = history.find(h => h.id === exp.id);
  if (historyEntry) {
    historyEntry.status = 'promoted';
    historyEntry.promoted_at = now.toISOString();
    saveHistory(history);
  }

  // Cleanup variant configs + Netlify sites
  await cleanupVariants(exp);

  console.log(`\n✅  Promotion complete for ${exp.id}`);
  console.log(`   Commit and push to deploy the improved site.\n`);
}

async function cleanupVariants(exp) {
  console.log('\n  Cleaning up variant artifacts...');
  for (const v of exp.variants) {
    if (v.label === 'control') continue;

    // Delete variant config file
    const cfgPath = path.join(CONFIGS_DIR, `${v.name}.json`);
    if (fs.existsSync(cfgPath)) {
      fs.unlinkSync(cfgPath);
      console.log(`  ✓ Deleted config: ${v.name}.json`);
    }

    // Delete variant site directory
    const siteDir = path.join(ROOT, 'sites', v.name);
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true });
      console.log(`  ✓ Deleted site dir: sites/${v.name}/`);
    }

    // Delete variant Cloudflare Worker
    await deleteCloudflareWorker(v.name);
  }
}

// ── Run ──────────────────────────────────────────────────────
const runners = { generate: runGenerate, measure: runMeasure, promote: runPromote };
runners[MODE]().catch(e => { console.error('❌', e.message); process.exit(1); });
