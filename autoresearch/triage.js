#!/usr/bin/env node
/**
 * autoresearch/triage.js — Automated Issue Triage
 *
 * Triggered by GitHub Actions when a weekly-digest, reconciliation, or
 * reconcile issue is opened. Calls the Claude API to analyse the issue,
 * then posts a prioritised action comment and optionally auto-closes if
 * everything looks healthy.
 *
 * Required env vars (set in triage.yml):
 *   ISSUE_NUMBER      — GitHub issue number
 *   ISSUE_TITLE       — Issue title
 *   ISSUE_BODY        — Issue body (full markdown)
 *   ISSUE_LABELS      — Comma-separated label names
 *   ANTHROPIC_API_KEY — Claude API key
 *   GH_TOKEN          — GitHub token
 *   GITHUB_REPOSITORY — e.g. JackH1010101010/lite-stack
 */

const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE  = process.env.ISSUE_TITLE  || '';
const ISSUE_BODY   = process.env.ISSUE_BODY   || '';
const ISSUE_LABELS = (process.env.ISSUE_LABELS || '').split(',').map(s => s.trim());
const CLAUDE_KEY   = process.env.ANTHROPIC_API_KEY;
const GH_TOKEN     = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const GH_REPO      = process.env.GITHUB_REPOSITORY || 'JackH1010101010/lite-stack';

if (!ISSUE_NUMBER) { console.error('ISSUE_NUMBER not set'); process.exit(1); }

// ── Determine issue type ───────────────────────────────────────
function issueType() {
  if (ISSUE_LABELS.includes('weekly-digest'))  return 'weekly-digest';
  if (ISSUE_LABELS.includes('reconciliation')) return 'reconciliation';
  if (ISSUE_LABELS.includes('opportunity'))    return 'opportunity';
  if (ISSUE_LABELS.includes('hotel-refresh'))  return 'hotel-refresh';
  return 'unknown';
}

// ── Call Claude API ────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage) {
  if (!CLAUDE_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — using rule-based triage only');
    return null;
  }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) { console.warn('Claude API error:', res.status); return null; }
    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    console.warn('Claude fetch error:', e.message);
    return null;
  }
}

// ── Rule-based health check (fallback if no Claude key) ───────
function ruleBasedAnalysis(body, type) {
  const lines = body.toLowerCase();
  if (type === 'weekly-digest') {
    const hasProblems = ['🚨', '⚠️', 'low:', 'high drop', 'zero page'].some(s => lines.includes(s.toLowerCase()));
    const healthy = ['✅', 'healthy', 'no urgent'].filter(s => lines.includes(s.toLowerCase())).length;
    if (!hasProblems && healthy >= 2) {
      return { autoClose: true, summary: 'All funnel metrics look healthy this week. Auto-closing.' };
    }
    return { autoClose: false, summary: 'Issues detected — review required.' };
  }
  if (type === 'reconciliation') {
    const hasAnomalies = ['posthog_no_liteapi', 'liteapi_no_posthog', 'revenue_discrepancy'].some(s => lines.includes(s));
    return { autoClose: !hasAnomalies, summary: hasAnomalies ? 'Revenue anomalies found — review required.' : 'Clean reconciliation.' };
  }
  return { autoClose: false, summary: 'Review required.' };
}

// ── Build triage prompt by type ────────────────────────────────
function buildPrompt(type) {
  const base = `You are the automated operations assistant for Lite-Stack, a luxury hotel booking platform.
Your job is to triage automated monitoring issues and output a concise, actionable comment.
Be direct and specific. No filler. Max 400 words.`;

  if (type === 'weekly-digest') return {
    system: base,
    user: `Analyse this weekly digest issue and output a comment with:
1. One-line verdict: 🟢 Healthy / 🟡 Watch / 🔴 Action needed
2. Top 1-3 specific actions (if any) as checkboxes — be concrete, not generic
3. Whether to auto-close (yes if everything is 🟢)

Issue body:
${ISSUE_BODY.slice(0, 3000)}`,
  };

  if (type === 'reconciliation') return {
    system: base,
    user: `Analyse this booking reconciliation issue and output a comment with:
1. Severity: 🟢 Clean / 🟡 Minor / 🔴 Revenue at risk
2. For each anomaly: what it likely means and what to check
3. Whether to auto-close (yes if 🟢)

Issue body:
${ISSUE_BODY.slice(0, 3000)}`,
  };

  if (type === 'hotel-refresh') return {
    system: base,
    user: `Analyse this hotel inventory refresh issue listing new hotels found by LiteAPI.
Output a comment with:
1. Which hotels look worth adding (stars ≥4, rating ≥7.5, reviews ≥200)
2. Which to skip and why
3. A priority order for adding them

Issue body:
${ISSUE_BODY.slice(0, 3000)}`,
  };

  if (type === 'opportunity') return {
    system: base,
    user: `Analyse this market opportunity report for new city/niche expansion.
Output a comment recommending:
1. Top 2 opportunities to pursue this month
2. One sentence on why each
3. What the next concrete action is (e.g. "create dubai-ultra2 config")

Issue body:
${ISSUE_BODY.slice(0, 3000)}`,
  };

  return { system: base, user: `Summarise this issue and suggest next actions:\n\n${ISSUE_BODY.slice(0, 2000)}` };
}

// ── Post GitHub comment ────────────────────────────────────────
async function postComment(body) {
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues/${ISSUE_NUMBER}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) console.warn('Failed to post comment:', res.status);
  else console.log('✓ Comment posted');
}

async function closeIssue() {
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues/${ISSUE_NUMBER}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });
  if (!res.ok) console.warn('Failed to close issue:', res.status);
  else console.log('✓ Issue auto-closed (healthy)');
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const type = issueType();
  console.log(`Triaging issue #${ISSUE_NUMBER} [type: ${type}]`);

  if (type === 'unknown') {
    console.log('Unknown issue type — skipping triage');
    return;
  }

  let comment;
  let autoClose = false;

  if (CLAUDE_KEY) {
    const { system, user } = buildPrompt(type);
    const analysis = await callClaude(system, user);
    if (analysis) {
      const shouldClose = analysis.toLowerCase().includes('auto-close: yes')
        || analysis.toLowerCase().includes('auto-close (yes)')
        || analysis.toLowerCase().includes('🟢') && !analysis.toLowerCase().includes('🔴') && !analysis.toLowerCase().includes('🟡');
      autoClose = shouldClose;
      comment = `### 🤖 Automated Triage\n\n${analysis}\n\n---\n_Triage by claude-haiku · [autoresearch/triage.js](https://github.com/${GH_REPO}/blob/main/autoresearch/triage.js)_`;
    }
  }

  // Fallback to rule-based if Claude unavailable
  if (!comment) {
    const { autoClose: ruleClose, summary } = ruleBasedAnalysis(ISSUE_BODY, type);
    autoClose = ruleClose;
    comment = `### 🤖 Automated Triage\n\n${summary}\n\n---\n_Rule-based triage · Claude API key not configured_`;
  }

  if (GH_TOKEN) {
    await postComment(comment);
    if (autoClose) await closeIssue();
  } else {
    console.log('No GH_TOKEN — printing analysis only\n');
    console.log(comment);
  }
}

main().catch(e => { console.error('Triage failed:', e.message); process.exit(1); });
