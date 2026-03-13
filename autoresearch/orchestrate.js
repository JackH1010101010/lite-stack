#!/usr/bin/env node
/**
 * autoresearch/orchestrate.js — The Autonomous Loop Brain
 *
 * Runs weekly (Wednesday 05:00 UTC via GitHub Actions).
 * Reads all signals, measures pending experiments, promotes canary winners,
 * and decides what to test next via Claude.
 *
 * Four phases per run:
 *   A. Measure any experiments past their measurement window
 *   B. Check canary experiments past canary window → promote or rollback
 *   C. Read all signals (triage comments, history, strategy, PostHog)
 *   D. Decide what to test next → dispatch to executor
 *
 * Usage:
 *   node autoresearch/orchestrate.js                  (full run)
 *   node autoresearch/orchestrate.js --dry-run        (read signals + decide, no dispatch)
 *   node autoresearch/orchestrate.js --signals-only   (just print signal summary)
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY       — Claude API key
 *   GITHUB_TOKEN / GH_TOKEN — GitHub API access
 *   GITHUB_REPOSITORY       — owner/repo
 *   POSTHOG_PERSONAL_KEY    — PostHog personal API key (read)
 *   POSTHOG_PROJECT_ID      — PostHog project ID
 *   NETLIFY_AUTH_TOKEN       — Netlify PAT (for promotions)
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');
const { runWorkflow, listWorkflows, proposeWorkflow } = require('./workflow-runner');

// ── Config ───────────────────────────────────────────────────
const ROOT             = path.join(__dirname, '..');
const EXPERIMENTS_FILE = path.join(__dirname, 'experiments.json');
const HISTORY_FILE     = path.join(__dirname, 'history.json');
const HISTORY_SUMMARY  = path.join(__dirname, 'history-summary.json');
const STRATEGY_FILE    = path.join(ROOT, 'research', 'autoresearch', 'STRATEGY-PACK.md');
const RATE_SNAPSHOT    = path.join(__dirname, 'rate-snapshot.json');
const CONTENT_AUDIT    = path.join(__dirname, 'content-audit.json');

const GH_TOKEN     = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const GH_REPO      = process.env.GITHUB_REPOSITORY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const PH_PERSONAL  = process.env.POSTHOG_PERSONAL_KEY || '';
const PH_PROJECT   = process.env.POSTHOG_PROJECT_ID || '';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const GH_API       = 'https://api.github.com';

// Template-based sites eligible for experiments (NOT luxstay — it's a submodule)
const TEMPLATE_SITES = ['dubai-ultra', 'maldives-escape', 'luxstay'];

const HISTORY_SUMMARY_MAX_AGE_DAYS = 7;
const HISTORY_SUMMARY_THRESHOLD    = 50;

// ── CLI ──────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const SIGNALS_ONLY = args.includes('--signals-only');

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function log(phase, msg) {
  const prefix = { A: '📏', B: '🐤', C: '📡', D: '🧠' }[phase] || '🔧';
  console.log(`  ${prefix} [Phase ${phase}] ${msg}`);
}

// ── GitHub API ───────────────────────────────────────────────
async function ghFetch(endpoint) {
  if (!GH_TOKEN || !GH_REPO) return null;
  const url = `${GH_API}/repos/${GH_REPO}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) return null;
  return res.json();
}

async function getLatestIssueWithTriage(label) {
  const issues = await ghFetch(`/issues?labels=${label}&state=all&per_page=1&sort=created&direction=desc`);
  if (!issues || issues.length === 0) return null;

  const issue = issues[0];
  const comments = await ghFetch(`/issues/${issue.number}/comments`);
  if (!comments) return { issue, triage: null, machine: null };

  // Find triage comment
  const triageComment = comments.find(c =>
    c.body && (c.body.includes('Automated Triage') || c.body.includes('## Triage'))
  );

  // Parse machine-readable block from issue body
  let machine = null;
  const machineMatch = issue.body?.match(/<!-- machine: ({.*?}) -->/s);
  if (machineMatch) {
    try { machine = JSON.parse(machineMatch[1]); } catch {}
  }

  return {
    issue: { number: issue.number, title: issue.title, created_at: issue.created_at },
    triage: triageComment ? triageComment.body : null,
    machine
  };
}

// ── Claude API ───────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 1024) {
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
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Strategy Pack parsing ────────────────────────────────────
function parseStrategyPack() {
  try {
    const content = fs.readFileSync(STRATEGY_FILE, 'utf8');
    const blocks = {};

    // Extract machine-readable JSON blocks: <!-- machine_strategy: {...} -->
    const patterns = [
      /<!-- machine_strategy: ({[\s\S]*?}) -->/,
      /<!-- strategy_signals: ({[\s\S]*?}) -->/,
      /<!-- serp_intelligence: ({[\s\S]*?}) -->/
    ];
    const names = ['machine_strategy', 'strategy_signals', 'serp_intelligence'];

    patterns.forEach((pat, i) => {
      const m = content.match(pat);
      if (m) {
        try { blocks[names[i]] = JSON.parse(m[1]); } catch {}
      }
    });

    return Object.keys(blocks).length > 0 ? blocks : null;
  } catch {
    return null;
  }
}

// ── PostHog: AI agent booking data ───────────────────────────
async function getAIAgentMetrics(sinceDays = 30) {
  if (!PH_PERSONAL || !PH_PROJECT) return null;
  try {
    const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://us.i.posthog.com/api/projects/${PH_PROJECT}/events/?event=ai_agent_booking_completed&after=${since}&limit=100`,
      { headers: { Authorization: `Bearer ${PH_PERSONAL}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const bookings = data.results || [];
    return {
      total_bookings: bookings.length,
      period: `${sinceDays}d`,
      since
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  PHASE A: MEASURE PENDING EXPERIMENTS
// ══════════════════════════════════════════════════════════════
async function phaseA(experiments) {
  console.log('\n── Phase A: Measure Pending Experiments ──────────────\n');
  const now = new Date();
  const pending = experiments.filter(e =>
    e.status === 'running' && new Date(e.measure_after) <= now
  );

  if (pending.length === 0) {
    log('A', 'No experiments due for measurement.');
    return;
  }

  for (const exp of pending) {
    log('A', `Measuring: ${exp.id} (${exp.site})`);
    try {
      execSync(
        `node autoresearch/evolve.js --site ${exp.site} --measure --force`,
        { stdio: 'inherit', cwd: ROOT }
      );
    } catch (e) {
      log('A', `⚠ Measurement failed for ${exp.id}: ${e.message}`);
    }
  }

  // Reload experiments after measurement
  return readJSON(EXPERIMENTS_FILE, []);
}

// ══════════════════════════════════════════════════════════════
//  PHASE B: CHECK CANARY EXPERIMENTS
// ══════════════════════════════════════════════════════════════
async function phaseB(experiments) {
  console.log('\n── Phase B: Check Canary Experiments ─────────────────\n');
  const now = new Date();
  const canaries = experiments.filter(e =>
    e.status === 'canary' && e.canary_until && new Date(e.canary_until) <= now
  );

  if (canaries.length === 0) {
    log('B', 'No canary experiments ready for promotion.');
    return;
  }

  for (const exp of canaries) {
    log('B', `Promoting canary: ${exp.id} (${exp.site})`);
    if (DRY_RUN) {
      log('B', `[DRY RUN] Would promote ${exp.id}`);
      continue;
    }
    try {
      execSync(
        `node autoresearch/evolve.js --site ${exp.site} --promote --force`,
        { stdio: 'inherit', cwd: ROOT }
      );

      // ── Post-experiment reflection ──────────────────────────
      // After a successful promotion, ask Claude to extract a lesson.
      // This feeds the evolving strategy context for future decisions.
      if (ANTHROPIC_KEY) {
        try {
          const winner = exp.variants?.find(v => v.label !== 'control' && v.conversions > 0);
          const control = exp.variants?.find(v => v.label === 'control');
          const lift = winner && control && control.visitors > 0
            ? (((winner.conversions / winner.visitors) - (control.conversions / control.visitors)) / (control.conversions / control.visitors) * 100).toFixed(1)
            : 'unknown';

          const reflectionRaw = await callClaude(
            `An A/B test just completed and was promoted:\n` +
            `Site: ${exp.site}\n` +
            `Type: ${exp.experiment_type}\n` +
            `Hypothesis: ${exp.hypothesis || 'not recorded'}\n` +
            `Winner: ${winner?.label || 'unknown'} with ${lift}% lift\n` +
            `Variants tested: ${exp.variants?.length || 0}\n\n` +
            `What lesson should we learn from this result? What should we test next?\n\n` +
            `Return JSON only:\n{"lesson": "...", "next_hypothesis": "...", "strategy_update": "..."}`,
            512
          );
          const jsonMatch = reflectionRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const reflection = JSON.parse(jsonMatch[0]);
            const learningsFile = path.join(__dirname, 'strategy-learnings.json');
            const learnings = readJSON(learningsFile, []);
            learnings.push({
              timestamp: new Date().toISOString(),
              experiment_id: exp.id,
              site: exp.site,
              type: exp.experiment_type,
              lift,
              ...reflection
            });
            // Keep last 50 learnings
            if (learnings.length > 50) learnings.splice(0, learnings.length - 50);
            writeJSON(learningsFile, learnings);
            log('B', `  📝 Reflection saved: ${reflection.lesson?.slice(0, 80)}`);
          }
        } catch (e) {
          log('B', `  ⚠ Reflection generation failed (non-blocking): ${e.message?.slice(0, 80)}`);
        }
      }
    } catch (e) {
      log('B', `⚠ Promotion failed for ${exp.id}: ${e.message}`);
    }
  }

  return readJSON(EXPERIMENTS_FILE, []);
}

// ══════════════════════════════════════════════════════════════
//  PHASE C: READ ALL SIGNALS
// ══════════════════════════════════════════════════════════════
async function phaseC() {
  console.log('\n── Phase C: Read All Signals ─────────────────────────\n');

  // ── Inline signal refresh: re-run cheap signals before reading ──
  // This ensures the orchestrator never decides on stale local data.
  log('C', 'Refreshing cheap signals inline...');
  for (const cmd of [
    { label: 'rate-snapshot', script: 'node autoresearch/rate-monitor.js --snapshot-only' },
    { label: 'content-audit', script: 'node autoresearch/content-audit.js --quick' }
  ]) {
    try {
      execSync(cmd.script, { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
      log('C', `  ✓ ${cmd.label} refreshed`);
    } catch (e) {
      log('C', `  ⚠ ${cmd.label} refresh failed (using cached): ${e.message?.slice(0, 80)}`);
    }
  }

  const signals = {
    weekly_digest: null,
    hotel_refresh: null,
    explore: null,
    reconciliation: null,
    rate_monitor: null,
    rate_snapshot: null,
    content_audit: null,
    history: null,
    history_summary: null,
    strategy: null,
    ai_agent: null,
    signal_count: 0,
    signal_total: 11
  };

  // 1. Weekly digest triage
  log('C', 'Fetching weekly-digest triage...');
  signals.weekly_digest = await getLatestIssueWithTriage('weekly-digest');
  if (signals.weekly_digest?.triage) signals.signal_count++;

  // 2. Hotel refresh triage
  log('C', 'Fetching hotel-refresh triage...');
  signals.hotel_refresh = await getLatestIssueWithTriage('hotel-refresh');
  if (signals.hotel_refresh?.triage) signals.signal_count++;

  // 3. Explore triage
  log('C', 'Fetching explore/opportunity triage...');
  signals.explore = await getLatestIssueWithTriage('opportunity');
  if (signals.explore?.triage) signals.signal_count++;

  // 4. Reconciliation triage
  log('C', 'Fetching reconciliation triage...');
  signals.reconciliation = await getLatestIssueWithTriage('reconciliation');
  if (signals.reconciliation?.triage) signals.signal_count++;

  // 5. Rate monitor issue triage
  log('C', 'Fetching rate-monitor triage...');
  signals.rate_monitor = await getLatestIssueWithTriage('rate-monitor');
  if (signals.rate_monitor?.machine) signals.signal_count++;

  // 6. Rate snapshot (local file from rate-monitor.js)
  log('C', 'Reading rate-snapshot.json...');
  const rateSnapshot = readJSON(RATE_SNAPSHOT, null);
  if (rateSnapshot && rateSnapshot.results) {
    const snapshotAge = rateSnapshot.timestamp
      ? (Date.now() - new Date(rateSnapshot.timestamp).getTime()) / 86400000
      : Infinity;
    if (snapshotAge <= 14) {
      signals.rate_snapshot = {
        timestamp: rateSnapshot.timestamp,
        total_hotels: rateSnapshot.total_hotels,
        low_margin: rateSnapshot.low_margin,
        great_margin: rateSnapshot.great_margin,
        unavailable: rateSnapshot.unavailable,
        low_margin_hotels: rateSnapshot.results
          .filter(r => r.status === 'low_margin')
          .map(r => ({ site: r.site, name: r.name, city: r.city, margin: r.margin })),
        great_margin_hotels: rateSnapshot.results
          .filter(r => r.status === 'great_margin')
          .map(r => ({ site: r.site, name: r.name, city: r.city, margin: r.margin }))
      };
      signals.signal_count++;
    } else {
      log('C', `  ⚠ Rate snapshot stale (${snapshotAge.toFixed(0)} days old)`);
    }
  }

  // 7. Content audit (local file from content-audit.js)
  log('C', 'Reading content-audit.json...');
  const contentAudit = readJSON(CONTENT_AUDIT, null);
  if (contentAudit && contentAudit.page_scores) {
    const auditAge = contentAudit.timestamp
      ? (Date.now() - new Date(contentAudit.timestamp).getTime()) / 86400000
      : Infinity;
    if (auditAge <= 14) {
      const belowThreshold = contentAudit.page_scores.filter(p => p.min_differentiation < (contentAudit.threshold || 0.4));
      signals.content_audit = {
        timestamp: contentAudit.timestamp,
        threshold: contentAudit.threshold,
        total_pages: contentAudit.total_pages,
        violations: contentAudit.violations,
        pages_at_risk: belowThreshold.length,
        worst_pages: belowThreshold.slice(0, 10).map(p => ({ site: p.site, slug: p.slug, diff: p.min_differentiation }))
      };
      signals.signal_count++;
    } else {
      log('C', `  ⚠ Content audit stale (${auditAge.toFixed(0)} days old)`);
    }
  }

  // 8. History
  log('C', 'Reading experiment history...');
  const history = readJSON(HISTORY_FILE, []);
  signals.history = history.slice(-10);
  if (history.length >= 5) signals.signal_count++;

  // 9. History summary (regenerate if stale)
  const summary = readJSON(HISTORY_SUMMARY, null);
  if (summary) {
    signals.history_summary = summary;
  }
  if (history.length > HISTORY_SUMMARY_THRESHOLD) {
    const summaryAge = summary?.generated_at
      ? (Date.now() - new Date(summary.generated_at).getTime()) / 86400000
      : Infinity;
    if (summaryAge > HISTORY_SUMMARY_MAX_AGE_DAYS && ANTHROPIC_KEY) {
      log('C', 'Regenerating history summary (>50 entries, summary stale)...');
      try {
        const summaryText = await callClaude(
          `Summarise these A/B test experiment results into lessons learned. What patterns work? What doesn't? What should we try next?\n\n${JSON.stringify(history, null, 2)}`,
          2048
        );
        const newSummary = { generated_at: new Date().toISOString(), content: summaryText };
        writeJSON(HISTORY_SUMMARY, newSummary);
        signals.history_summary = newSummary;
      } catch (e) {
        log('C', `⚠ History summary generation failed: ${e.message}`);
      }
    }
  }

  // 10. Strategy Pack
  log('C', 'Parsing STRATEGY-PACK.md...');
  signals.strategy = parseStrategyPack();
  if (signals.strategy) signals.signal_count++;

  // 11. AI agent metrics
  log('C', 'Fetching AI agent booking metrics...');
  signals.ai_agent = await getAIAgentMetrics();
  if (signals.ai_agent) signals.signal_count++;

  // Google Hotels data not yet available (Phase 0.5 Track B)
  // signals.google_hotels = await getGoogleHotelsMetrics();
  // if (signals.google_hotels) signals.signal_count++;

  const coverage = signals.signal_count / signals.signal_total;
  log('C', `Signal coverage: ${signals.signal_count}/${signals.signal_total} (${(coverage * 100).toFixed(0)}%)`);
  if (coverage < 0.375) {
    log('C', '⚠ LOW-CONFIDENCE: fewer than 3/8 signal sources available');
  }

  return signals;
}

// ══════════════════════════════════════════════════════════════
//  PHASE D: DECIDE + DISPATCH
// ══════════════════════════════════════════════════════════════
async function phaseD(experiments, signals) {
  console.log('\n── Phase D: Decide + Dispatch ────────────────────────\n');
  const history = readJSON(HISTORY_FILE, []);
  const now = new Date();

  // Check which sites have active experiments
  const activeSites = experiments
    .filter(e => ['running', 'canary'].includes(e.status))
    .map(e => e.site);

  const availableSites = TEMPLATE_SITES.filter(s => !activeSites.includes(s));
  if (availableSites.length === 0) {
    log('D', 'All experiment slots occupied. Skipping decision.');
    history.push({
      type: 'decision',
      timestamp: now.toISOString(),
      chosen: 'skip',
      reasoning: 'All template-based sites have active experiments.',
      signal_coverage: `${signals.signal_count}/${signals.signal_total}`
    });
    writeJSON(HISTORY_FILE, history);
    return;
  }

  // Build experiment options
  const options = [];

  // Hotel add options
  if (signals.hotel_refresh?.machine?.action_needed) {
    for (const site of availableSites) {
      options.push({
        type: 'hotel_add',
        site,
        description: `Add new hotels to ${site} (hotel-refresh recommends additions)`
      });
    }
  }

  // City add options
  if (signals.explore?.machine?.score >= 70) {
    options.push({
      type: 'city_add',
      city: signals.explore.machine.top_city || 'unknown',
      description: `Launch new city: ${signals.explore.machine.top_city} (opportunity score: ${signals.explore.machine.score})`
    });
  }

  // Copy test options (default)
  for (const site of availableSites) {
    const siteHistory = history.filter(h => h.site === site && h.experiment_type === 'copy_test');
    const lastThree = siteHistory.slice(-3);
    const consecutiveNoLift = lastThree.length === 3 && lastThree.every(h => {
      const lift = parseFloat(h.lift) || 0;
      return lift <= 0;
    });

    if (!consecutiveNoLift) {
      options.push({
        type: 'copy_test',
        site,
        description: `Run copy A/B test on ${site} (${siteHistory.length} previous tests)`
      });
    } else {
      log('D', `Skipping copy test on ${site}: 3 consecutive no-lift results`);
    }
  }

  // Rate-driven options (if rate snapshot shows action needed)
  if (signals.rate_snapshot?.low_margin > 0 || signals.rate_monitor?.machine?.action_needed) {
    for (const site of availableSites) {
      const lowMarginForSite = (signals.rate_snapshot?.low_margin_hotels || [])
        .filter(h => h.site === site);
      if (lowMarginForSite.length > 0) {
        options.push({
          type: 'hotel_visibility',
          site,
          description: `Adjust hotel visibility on ${site}: ${lowMarginForSite.length} low-margin hotels to de-prioritise, potential great-margin hotels to feature`
        });
      }
    }
  }

  // MicroFish differentiation fix (if content audit shows violations)
  if (signals.content_audit?.violations > 0) {
    const atRiskSites = [...new Set(signals.content_audit.worst_pages.map(p => p.site))];
    for (const site of atRiskSites.filter(s => availableSites.includes(s))) {
      const pagesAtRisk = signals.content_audit.worst_pages.filter(p => p.site === site);
      options.push({
        type: 'microfish',
        site,
        description: `MicroFish differentiation fix on ${site}: ${pagesAtRisk.length} pages below ${(signals.content_audit.threshold * 100).toFixed(0)}% threshold (worst: ${(pagesAtRisk[0]?.diff * 100).toFixed(0)}%)`
      });
    }
  }

  // SEO test options (if copy tests are exhausted)
  for (const site of availableSites) {
    const siteHistory = history.filter(h => h.site === site);
    const lastThreeCopy = siteHistory.filter(h => h.experiment_type === 'copy_test').slice(-3);
    if (lastThreeCopy.length === 3 && lastThreeCopy.every(h => (parseFloat(h.lift) || 0) <= 0)) {
      options.push({
        type: 'seo_test',
        site,
        description: `Try SEO title/meta test on ${site} (copy tests stalled)`
      });
    }
  }

  // Distribution options — check for undistributed guides
  try {
    const guidesDir = path.join(ROOT, 'sites', 'luxstay', 'guides');
    const distLog = path.join(ROOT, 'distribution', 'distribution-log.json');
    const distributed = readJSON(distLog, []).map(d => d.guide_id);
    if (fs.existsSync(guidesDir)) {
      const guides = fs.readdirSync(guidesDir).filter(f => !f.startsWith('.'));
      const undistributed = guides.filter(g => !distributed.includes(g));
      if (undistributed.length > 0) {
        options.push({
          type: 'reddit_distribute',
          guide_id: undistributed[0],
          description: `Distribute guide "${undistributed[0]}" to Reddit (${undistributed.length} guides pending distribution)`
        });
      }
    }
  } catch (e) {
    log('D', `⚠ Distribution check failed: ${e.message?.slice(0, 80)}`);
  }

  if (options.length === 0) {
    log('D', 'No viable experiment options. All sites exhausted or occupied.');
    history.push({
      type: 'observation',
      timestamp: now.toISOString(),
      observation: 'No viable experiment options — all sites have active experiments or exhausted copy test options.',
      signal_coverage: `${signals.signal_count}/${signals.signal_total}`
    });
    writeJSON(HISTORY_FILE, history);
    return;
  }

  // ── Build shared context for decision prompts ────────────────
  const triageSummaries = [];
  if (signals.weekly_digest?.triage) triageSummaries.push(`Weekly Digest Triage:\n${signals.weekly_digest.triage.slice(0, 500)}`);
  if (signals.hotel_refresh?.triage) triageSummaries.push(`Hotel Refresh Triage:\n${signals.hotel_refresh.triage.slice(0, 500)}`);
  if (signals.explore?.triage) triageSummaries.push(`Market Explore Triage:\n${signals.explore.triage.slice(0, 500)}`);
  if (signals.reconciliation?.triage) triageSummaries.push(`Reconciliation Triage:\n${signals.reconciliation.triage.slice(0, 500)}`);

  const strategyContext = signals.strategy
    ? `\nStrategic context from STRATEGY-PACK.md:\n${JSON.stringify(signals.strategy, null, 2).slice(0, 1000)}`
    : '';

  const aiContext = signals.ai_agent
    ? `\nAI Agent metrics (last ${signals.ai_agent.period}): ${signals.ai_agent.total_bookings} bookings`
    : '';

  const rateContext = signals.rate_snapshot
    ? `\nRate monitor snapshot (${signals.rate_snapshot.timestamp?.slice(0, 10) || 'recent'}):
- ${signals.rate_snapshot.low_margin} hotels with low margin (<8%) — consider hiding or de-prioritising
- ${signals.rate_snapshot.great_margin} hotels with great margin (>25%) — feature prominently
- ${signals.rate_snapshot.unavailable} hotels unavailable
${signals.rate_snapshot.great_margin_hotels?.length ? 'High-margin hotels to feature: ' + signals.rate_snapshot.great_margin_hotels.map(h => `${h.name} (${h.city}, ${(h.margin * 100).toFixed(0)}%)`).join(', ') : ''}
${signals.rate_snapshot.low_margin_hotels?.length ? 'Low-margin hotels to hide: ' + signals.rate_snapshot.low_margin_hotels.map(h => `${h.name} (${h.city}, ${(h.margin * 100).toFixed(0)}%)`).join(', ') : ''}`
    : '';

  const contentAuditContext = signals.content_audit
    ? `\nContent audit (${signals.content_audit.timestamp?.slice(0, 10) || 'recent'}):
- ${signals.content_audit.violations} page pairs below ${(signals.content_audit.threshold * 100).toFixed(0)}% differentiation threshold
- ${signals.content_audit.pages_at_risk} pages at risk of Google penalty
- Worst: ${signals.content_audit.worst_pages?.slice(0, 3).map(p => `${p.slug} (${(p.diff * 100).toFixed(0)}%)`).join(', ')}
⚠ Google's Dec 2025 update penalises sites with <30% unique content. Our threshold is ${(signals.content_audit.threshold * 100).toFixed(0)}%.`
    : '';

  const rateMonitorContext = signals.rate_monitor?.machine
    ? `\nRate monitor alert: ${signals.rate_monitor.machine.low_margin || 0} low-margin, ${signals.rate_monitor.machine.unavailable || 0} unavailable (action_needed: ${signals.rate_monitor.machine.action_needed})`
    : '';

  const historySummaryContext = signals.history_summary?.content
    ? `\nLessons learned (auto-generated summary):\n${signals.history_summary.content.slice(0, 500)}`
    : '';

  // Strategy learnings from post-experiment reflections (evolving context)
  const learningsFile = path.join(__dirname, 'strategy-learnings.json');
  const strategyLearnings = readJSON(learningsFile, []);
  const learningsContext = strategyLearnings.length > 0
    ? `\nPost-experiment reflections (most recent ${Math.min(strategyLearnings.length, 5)}):\n${strategyLearnings.slice(-5).map(l => `- [${l.type}/${l.site}] ${l.lesson} (lift: ${l.lift}%)`).join('\n')}`
    : '';

  const sharedContext = `Signal coverage: ${signals.signal_count}/${signals.signal_total} sources available.
${signals.signal_count < 3 ? '⚠ LOW-CONFIDENCE — limited signal data. Prefer conservative choices.' : ''}

${triageSummaries.length > 0 ? 'Triage summaries:\n' + triageSummaries.join('\n\n') : 'No triage data available yet.'}
${strategyContext}
${aiContext}
${rateContext}
${rateMonitorContext}
${contentAuditContext}
${historySummaryContext}
${learningsContext}

Recent experiment history (last 10):
${JSON.stringify(signals.history.slice(-10), null, 2)}

Available experiment options:
${options.map((o, i) => `${i}: [${o.type}] ${o.description}`).join('\n')}

Current date: ${now.toISOString().slice(0, 10)}
Available template sites: ${availableSites.join(', ')}`;

  // ── Multi-Agent Scoring (4 perspectives) ────────────────────
  // Each agent scores the same options through a different lens.
  // Consensus reduces single-perspective bias.
  const AGENT_PERSPECTIVES = [
    {
      name: 'Growth',
      emoji: '📈',
      instruction: `You are the GROWTH agent. Your sole objective is maximising member signups and activation rate. Ask yourself: "What's blocking conversion? Which experiment will drive the most new members?" Favour experiments that widen the funnel — new cities, new content, sign-up flow improvements. Penalise experiments that only help existing members.`
    },
    {
      name: 'Revenue',
      emoji: '💰',
      instruction: `You are the REVENUE agent. Your sole objective is maximising booking revenue and margin. Ask yourself: "What's the highest-margin opportunity right now? Which experiment directly increases bookings or average order value?" Favour experiments on high-traffic sites with proven conversion, hotel additions in premium destinations, and rate optimisation. Penalise experiments with indirect revenue impact.`
    },
    {
      name: 'SEO',
      emoji: '🔍',
      instruction: `You are the SEO agent. Your sole objective is maximising organic search traffic and SERP visibility. Ask yourself: "Where are we leaving impressions on the table? Which experiment improves rankings, CTR, or content authority?" Favour SEO title tests, new content pages, city launches for underserved keywords. Penalise experiments that don't affect organic discoverability.`
    },
    {
      name: 'Distribution',
      emoji: '📣',
      instruction: `You are the DISTRIBUTION agent. Your sole objective is maximising external traffic and brand awareness. Ask yourself: "Do we have published content that isn't being distributed? Are we missing easy wins on Reddit, social, or paid channels?" Favour experiments that create distributable content (guides, comparison pages) or directly trigger distribution (reddit_distribute, ads_optimise). Penalise experiments that only optimise on-site without driving new eyeballs.`
    }
  ];

  function buildAgentPrompt(perspective) {
    return `You are evaluating experiment options for Lite-Stack, an autonomous hotel booking site optimisation system.

${perspective.instruction}

${sharedContext}

Score EVERY option from 1-10 based on your perspective. Higher = more aligned with your objective. Also pick your top recommendation and explain in 1 sentence.

Return JSON only:
{
  "scores": [<score_for_option_0>, <score_for_option_1>, ...],
  "top_choice": <option_index>,
  "reasoning": "<1 sentence from your perspective>",
  "prediction": "<what you expect to happen if your choice is picked>"
}`;
  }

  log('D', 'Multi-agent scoring: querying 4 perspectives in parallel...');

  let agentResults = [];
  let decision;

  try {
    // Fire all 3 agent calls in parallel
    const agentPromises = AGENT_PERSPECTIVES.map(async (perspective) => {
      try {
        const raw = await callClaude(buildAgentPrompt(perspective));
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error(`No JSON from ${perspective.name} agent`);
        const parsed = JSON.parse(jsonMatch[0]);
        return { name: perspective.name, emoji: perspective.emoji, ...parsed, error: null };
      } catch (e) {
        return { name: perspective.name, emoji: perspective.emoji, scores: [], top_choice: 0, reasoning: `Failed: ${e.message}`, prediction: '', error: e.message };
      }
    });

    agentResults = await Promise.all(agentPromises);
    const validResults = agentResults.filter(r => !r.error && r.scores.length === options.length);

    // Log individual agent perspectives
    for (const agent of agentResults) {
      const status = agent.error ? `⚠ ${agent.error}` : `top pick: option ${agent.top_choice} (scores: ${agent.scores.join(', ')})`;
      log('D', `  ${agent.emoji} ${agent.name}: ${status}`);
      if (!agent.error) log('D', `     ${agent.reasoning}`);
    }

    if (validResults.length === 0) throw new Error('All agent perspectives failed');

    // ── Consensus: weighted average scores ──────────────────
    // Each agent has equal weight. Sum scores across agents per option.
    const aggregateScores = options.map((_, i) => {
      const scores = validResults.map(r => r.scores[i] || 0);
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = sum / validResults.length;
      return { index: i, avg, scores, agentVotes: validResults.filter(r => r.top_choice === i).length };
    });

    // Sort by: (1) most agent votes, (2) highest average score
    aggregateScores.sort((a, b) => {
      if (b.agentVotes !== a.agentVotes) return b.agentVotes - a.agentVotes;
      return b.avg - a.avg;
    });

    const winner = aggregateScores[0];
    const consensusLevel = winner.agentVotes >= 3 ? 'strong' : winner.agentVotes >= 2 ? 'majority' : winner.agentVotes === 1 ? 'split' : 'score-only';

    log('D', `\n  Consensus: option ${winner.index} (avg score: ${winner.avg.toFixed(1)}, votes: ${winner.agentVotes}/4, consensus: ${consensusLevel})`);

    // Build composite decision from multi-agent results
    const winnerAgent = validResults.find(r => r.top_choice === winner.index) || validResults[0];
    decision = {
      choice: winner.index,
      reasoning: `Multi-agent ${consensusLevel} consensus (${validResults.length}/4 agents). ${winnerAgent.reasoning}`,
      strategy_alignment: `${validResults.filter(r => r.top_choice === winner.index).map(r => r.name).join(' + ')} aligned`,
      prediction: winnerAgent.prediction,
      multi_agent: {
        consensus: consensusLevel,
        agents_responding: validResults.length,
        aggregate_scores: aggregateScores.map(s => ({ option: s.index, avg: s.avg, votes: s.agentVotes })),
        individual: agentResults.map(r => ({ agent: r.name, top_choice: r.top_choice, scores: r.scores, reasoning: r.reasoning }))
      }
    };

  } catch (e) {
    log('D', `⚠ Multi-agent scoring failed: ${e.message}`);
    // Fallback: pick first copy_test option
    const fallback = options.findIndex(o => o.type === 'copy_test');
    decision = {
      choice: fallback >= 0 ? fallback : 0,
      reasoning: 'Multi-agent scoring failed — defaulting to first available copy test.',
      strategy_alignment: 'fallback',
      prediction: 'Unknown — fallback decision',
      multi_agent: null
    };
  }

  const chosen = options[decision.choice] || options[0];
  log('D', `Decision: [${chosen.type}] ${chosen.description}`);
  log('D', `Reasoning: ${decision.reasoning}`);
  log('D', `Strategy alignment: ${decision.strategy_alignment}`);
  log('D', `Prediction: ${decision.prediction}`);

  // Log decision to history
  history.push({
    type: 'decision',
    timestamp: now.toISOString(),
    chosen: chosen.type,
    site: chosen.site || chosen.city || null,
    reasoning: decision.reasoning,
    strategy_alignment: decision.strategy_alignment,
    signal_coverage: `${signals.signal_count}/${signals.signal_total}`,
    multi_agent: decision.multi_agent || null,
    prediction: {
      expected_outcome: decision.prediction,
      check_after: new Date(now.getTime() + 14 * 86400000).toISOString()
    }
  });
  writeJSON(HISTORY_FILE, history);

  // Dispatch via workflow registry
  if (DRY_RUN) {
    log('D', `[DRY RUN] Would dispatch workflow: ${chosen.type} on ${chosen.site || chosen.city}`);
    return;
  }

  log('D', `Dispatching workflow: ${chosen.type}...`);
  try {
    const ctx = {};
    if (chosen.site) ctx.site = chosen.site;
    if (chosen.city) ctx.city = chosen.city;
    if (chosen.guide_id) ctx.guide_id = chosen.guide_id;

    const result = await runWorkflow(chosen.type, ctx);
    if (result.status === 'complete') {
      log('D', `✓ Workflow ${chosen.type} complete (${(result.totalDuration / 1000).toFixed(1)}s).`);
    } else {
      log('D', `⚠ Workflow ${chosen.type} ${result.status}.`);
    }
  } catch (e) {
    log('D', `⚠ Workflow dispatch failed: ${e.message}`);
    // Log failure as observation
    const h2 = readJSON(HISTORY_FILE, []);
    h2.push({
      type: 'observation',
      timestamp: now.toISOString(),
      observation: `Workflow ${chosen.type} failed on ${chosen.site || chosen.city}: ${e.message}`
    });
    writeJSON(HISTORY_FILE, h2);
  }
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║        🧠  ORCHESTRATOR — Autonomous Loop       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Date:     ${new Date().toISOString()}`);
  console.log(`  Mode:     ${DRY_RUN ? 'DRY RUN' : SIGNALS_ONLY ? 'SIGNALS ONLY' : 'FULL RUN'}`);
  console.log(`  Repo:     ${GH_REPO || '(not set)'}`);
  console.log(`  Sites:    ${TEMPLATE_SITES.join(', ')}`);

  let experiments = readJSON(EXPERIMENTS_FILE, []);

  // Phase A: Measure pending
  const updatedA = await phaseA(experiments);
  if (updatedA) experiments = updatedA;

  // Phase B: Check canaries
  const updatedB = await phaseB(experiments);
  if (updatedB) experiments = updatedB;

  // Phase C: Read signals
  const signals = await phaseC();

  if (SIGNALS_ONLY) {
    console.log('\n── Signal Summary ───────────────────────────────────');
    console.log(JSON.stringify(signals, null, 2));
    return;
  }

  // Phase D: Decide + Dispatch
  await phaseD(experiments, signals);

  // Post-run: commit if any files changed (in CI)
  if (!DRY_RUN && process.env.CI) {
    console.log('\n── Post-run: Committing changes ─────────────────────\n');
    try {
      execSync('git add autoresearch/experiments.json autoresearch/history.json autoresearch/history-summary.json 2>/dev/null || true', { cwd: ROOT });
      execSync('git diff --cached --quiet || git commit -m "chore(orchestrator): weekly cycle $(date +%Y-%m-%d)"', { cwd: ROOT, stdio: 'inherit' });
      execSync('git push', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✓ Changes committed and pushed.');

      // Trigger deploy if any promotion happened
      const promoted = experiments.some(e => e.status === 'promoted' && e.promoted_at &&
        (Date.now() - new Date(e.promoted_at).getTime()) < 600000);
      if (promoted) {
        console.log('  Triggering deploy workflow...');
        execSync('gh workflow run "Generate & Deploy Sites"', { cwd: ROOT, stdio: 'inherit' });
      }
    } catch (e) {
      console.log(`  ⚠ Post-run git operations: ${e.message}`);
    }
  }

  console.log('\n✅  Orchestrator run complete.\n');
}

main().catch(e => {
  console.error('❌ Orchestrator failed:', e.message);
  process.exit(1);
});
