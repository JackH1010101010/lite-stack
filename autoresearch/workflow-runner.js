#!/usr/bin/env node
/**
 * autoresearch/workflow-runner.js — Composable Workflow Executor
 *
 * Reads workflow definitions from workflows/registry.json and executes
 * multi-step pipelines. Replaces the hardcoded switch/case dispatcher
 * in orchestrate.js Phase D.
 *
 * Each workflow is a sequence of steps. Steps can be required or optional.
 * If a required step fails, the workflow aborts. Optional steps log warnings.
 *
 * Template variables in args (e.g. {{site}}, {{city}}, {{guide_id}}) are
 * replaced with values from the context object passed at runtime.
 *
 * Usage:
 *   const { runWorkflow, listWorkflows, getWorkflow } = require('./workflow-runner');
 *   await runWorkflow('microfish', { site: 'luxstay' });
 *   await runWorkflow('microfish_full', {});
 *
 * CLI:
 *   node autoresearch/workflow-runner.js --workflow microfish --site luxstay
 *   node autoresearch/workflow-runner.js --list
 *   node autoresearch/workflow-runner.js --workflow microfish_full --dry-run
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT          = path.join(__dirname, '..');
const REGISTRY_FILE = path.join(__dirname, 'workflows', 'registry.json');
const HISTORY_FILE  = path.join(__dirname, 'history.json');

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── Registry ─────────────────────────────────────────────────
function loadRegistry() {
  const reg = readJSON(REGISTRY_FILE, null);
  if (!reg?.workflows) throw new Error('Workflow registry not found or malformed');
  return reg.workflows;
}

function listWorkflows() {
  const workflows = loadRegistry();
  return Object.entries(workflows).map(([id, w]) => ({
    id,
    name: w.name,
    description: w.description,
    trigger: w.trigger,
    steps: w.steps.length,
    signals_required: w.signals_required || [],
    cooldown_days: w.cooldown_days || 0
  }));
}

function getWorkflow(id) {
  const workflows = loadRegistry();
  return workflows[id] || null;
}

// ── Template variable replacement ────────────────────────────
function interpolate(str, ctx) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || '');
}

// ── Workflow execution ───────────────────────────────────────
async function runWorkflow(workflowId, ctx = {}, options = {}) {
  const { dryRun = false } = options;
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error(`Unknown workflow: ${workflowId}`);

  const startTime = Date.now();
  console.log(`\n⚙  Workflow: ${workflow.name} (${workflowId})`);
  console.log(`   Steps: ${workflow.steps.length} | Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`   Context: ${JSON.stringify(ctx)}\n`);

  const stepResults = [];
  let aborted = false;

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const label = step.label || `Step ${i + 1}`;
    const args = interpolate(step.args || '', ctx);
    const fullCmd = step.script === 'log'
      ? null
      : `node ${step.script} ${args}`.trim();

    console.log(`   [${i + 1}/${workflow.steps.length}] ${label}`);

    if (step.script === 'log') {
      console.log(`   → ${interpolate(step.args, ctx)}`);
      stepResults.push({ step: i, label, status: 'logged', duration: 0 });
      continue;
    }

    if (dryRun) {
      console.log(`   → [DRY RUN] Would run: ${fullCmd}`);
      stepResults.push({ step: i, label, status: 'dry_run', command: fullCmd, duration: 0 });
      continue;
    }

    const stepStart = Date.now();
    try {
      execSync(fullCmd, { stdio: 'inherit', cwd: ROOT, timeout: 300000 });
      const duration = Date.now() - stepStart;
      console.log(`   ✓ ${label} (${(duration / 1000).toFixed(1)}s)\n`);
      stepResults.push({ step: i, label, status: 'success', command: fullCmd, duration });
    } catch (e) {
      const duration = Date.now() - stepStart;
      if (step.required) {
        console.error(`   ❌ ${label} FAILED (required): ${e.message}`);
        stepResults.push({ step: i, label, status: 'failed', command: fullCmd, error: e.message, duration });
        aborted = true;
        break;
      } else {
        console.warn(`   ⚠ ${label} failed (optional, continuing): ${e.message}\n`);
        stepResults.push({ step: i, label, status: 'failed_optional', command: fullCmd, error: e.message, duration });
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  const status = aborted ? 'aborted' : 'complete';

  console.log(`\n   ${aborted ? '❌' : '✅'} Workflow ${status} (${(totalDuration / 1000).toFixed(1)}s)\n`);

  // Log to history
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'workflow',
    timestamp: new Date().toISOString(),
    workflow_id: workflowId,
    workflow_name: workflow.name,
    context: ctx,
    status,
    steps_completed: stepResults.filter(s => s.status === 'success' || s.status === 'logged').length,
    steps_total: workflow.steps.length,
    duration_ms: totalDuration,
    dry_run: dryRun
  });
  writeJSON(HISTORY_FILE, history);

  return { workflowId, status, stepResults, totalDuration };
}

// ── Workflow proposal (for orchestrator to suggest new workflows) ──
async function proposeWorkflow(proposal) {
  const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  const GH_REPO  = process.env.GITHUB_REPOSITORY || '';

  if (!GH_TOKEN || !GH_REPO) {
    console.log('  ⚠ Cannot create proposal issue (no GH_TOKEN/GITHUB_REPOSITORY)');
    return null;
  }

  const { name, description, trigger, steps, reasoning } = proposal;
  const workflowId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const registryEntry = {
    name,
    description,
    trigger,
    steps: steps.map((s, i) => ({
      script: s.script,
      args: s.args || '',
      required: s.required !== false,
      label: s.label || `Step ${i + 1}`
    })),
    signals_required: proposal.signals_required || [],
    cooldown_days: proposal.cooldown_days || 14
  };

  const body = `## Workflow Proposal: ${name}

**Proposed by:** Orchestrator (multi-agent consensus)
**Date:** ${new Date().toISOString().slice(0, 10)}

### Description
${description}

### Trigger Condition
${trigger}

### Reasoning
${reasoning}

### Steps
${steps.map((s, i) => `${i + 1}. \`${s.script} ${s.args || ''}\` — ${s.label || 'Execute'} (${s.required !== false ? 'required' : 'optional'})`).join('\n')}

### Registry Entry
\`\`\`json
{
  "${workflowId}": ${JSON.stringify(registryEntry, null, 4)}
}
\`\`\`

### Action Required
- [ ] Review the proposed workflow
- [ ] Approve or reject
- [ ] If approved, add to \`autoresearch/workflows/registry.json\`

<!-- machine: ${JSON.stringify({ type: 'workflow_proposal', workflow_id: workflowId, action_needed: true, auto_approve: false })} -->`;

  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Workflow Proposal: ${name}`,
        body,
        labels: ['workflow-proposal', 'auto-generated']
      })
    });
    if (res.ok) {
      const issue = await res.json();
      console.log(`  ✓ Workflow proposal #${issue.number} created.`);
      return issue.number;
    }
  } catch (e) {
    console.log(`  ⚠ Proposal issue creation failed: ${e.message}`);
  }
  return null;
}

// ── Exports ──────────────────────────────────────────────────
module.exports = { runWorkflow, listWorkflows, getWorkflow, proposeWorkflow };

// ── CLI ──────────────────────────────────────────────────────
if (require.main === module) {
  const args    = process.argv.slice(2);
  const getArg  = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
  const dryRun  = args.includes('--dry-run');

  if (args.includes('--list')) {
    const wfs = listWorkflows();
    console.log('\n📋  Registered Workflows:\n');
    for (const wf of wfs) {
      console.log(`  ${wf.id.padEnd(22)} ${wf.name} (${wf.steps} steps)`);
      console.log(`  ${''.padEnd(22)} ${wf.description}`);
      console.log(`  ${''.padEnd(22)} Trigger: ${wf.trigger}\n`);
    }
    process.exit(0);
  }

  const workflowId = getArg('--workflow', null);
  if (!workflowId) {
    console.error('Usage: node workflow-runner.js --workflow <id> [--site <s>] [--city <c>] [--dry-run]');
    console.error('       node workflow-runner.js --list');
    process.exit(1);
  }

  const ctx = {};
  if (getArg('--site', null)) ctx.site = getArg('--site', null);
  if (getArg('--city', null)) ctx.city = getArg('--city', null);
  if (getArg('--guide', null)) ctx.guide_id = getArg('--guide', null);

  runWorkflow(workflowId, ctx, { dryRun }).catch(e => {
    console.error('❌', e.message);
    process.exit(1);
  });
}
