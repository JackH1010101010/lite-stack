#!/usr/bin/env node
/**
 * autoresearch/hotel-add.js — Auto Hotel Addition via Draft PR
 *
 * Reads the latest hotel-refresh GitHub issue, parses recommended hotels,
 * adds them to the relevant site config, and creates a draft PR.
 * Human reviews and merges — this is the approval gate.
 *
 * Usage:
 *   node autoresearch/hotel-add.js --site dubai-ultra          (add to specific site)
 *   node autoresearch/hotel-add.js --site dubai-ultra --auto   (read from latest hotel-refresh issue)
 *   node autoresearch/hotel-add.js --site dubai-ultra --dry-run
 *
 * Required env vars:
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT        = path.join(__dirname, '..');
const CONFIGS_DIR = path.join(ROOT, 'generator', 'configs');
const HISTORY_FILE = path.join(__dirname, 'history.json');
const GH_TOKEN    = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GH_REPO     = process.env.GITHUB_REPOSITORY || '';
const GH_API      = 'https://api.github.com';

// ── CLI ──────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const SITE    = getArg('--site', null);
const AUTO    = args.includes('--auto');
const DRY_RUN = args.includes('--dry-run');

if (!SITE) {
  console.error('Usage: node autoresearch/hotel-add.js --site <name> [--auto] [--dry-run]');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function ghFetch(endpoint, opts = {}) {
  if (!GH_TOKEN || !GH_REPO) return null;
  const res = await fetch(`${GH_API}/repos/${GH_REPO}${endpoint}`, {
    headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', ...opts.headers },
    ...opts
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Parse hotel-refresh issue for hotel candidates ───────────
function parseHotelCandidates(issueBody) {
  const hotels = [];
  if (!issueBody) return hotels;

  // Look for JSON code blocks containing hotel config snippets
  const jsonBlocks = issueBody.match(/```json\n([\s\S]*?)```/g) || [];
  for (const block of jsonBlocks) {
    const json = block.replace(/```json\n?/, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        hotels.push(...parsed.filter(h => h.id && h.name));
      } else if (parsed.id && parsed.name) {
        hotels.push(parsed);
      }
    } catch { /* not valid JSON, skip */ }
  }

  // Also parse markdown table rows as fallback:
  // | ID | Name | Stars | Rating | Reviews | City |
  const tableRows = issueBody.match(/\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]+\|/g) || [];
  for (const row of tableRows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 6 && cols[0].startsWith('lp')) {
      hotels.push({
        id: cols[0],
        name: cols[1],
        stars: parseInt(cols[2]) || 5,
        rating: parseFloat(cols[3]) || 0,
        reviews: parseInt(cols[4]) || 0,
        city: cols[5],
        emoji: '🏨',
        area: '',
        dist: '',
        desc: `${cols[2]}★ hotel with ${cols[3]}/10 rating.`,
        tags: [],
        badge: null
      });
    }
  }

  return hotels;
}

// ── Parse machine block from issue body ──────────────────────
function parseMachineBlock(body) {
  if (!body) return null;
  const m = body.match(/<!-- machine: ({[\s\S]*?}) -->/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏨  Hotel Add: ${SITE}${AUTO ? ' (auto from latest issue)' : ''}\n`);

  // Load site config
  const cfgPath = path.join(CONFIGS_DIR, `${SITE}.json`);
  if (!fs.existsSync(cfgPath)) {
    console.error(`Config not found: ${cfgPath}`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const existingIds = new Set();
  for (const hotels of Object.values(cfg.hotels || {})) {
    for (const h of hotels) existingIds.add(h.id);
  }

  let candidates = [];
  let issueNumber = null;

  if (AUTO) {
    // Fetch latest hotel-refresh issue
    console.log('  Fetching latest hotel-refresh issue...');
    const issues = await ghFetch('/issues?labels=hotel-refresh&state=all&per_page=1&sort=created&direction=desc');
    if (!issues || issues.length === 0) {
      console.log('  No hotel-refresh issues found.');
      return;
    }

    const issue = issues[0];
    issueNumber = issue.number;
    console.log(`  Found: #${issue.number} — ${issue.title}`);

    const machine = parseMachineBlock(issue.body);
    if (machine && machine.action_needed === false) {
      console.log('  Machine block says action_needed=false. Nothing to add.');
      return;
    }

    // Parse triage comment for priority recommendations
    const comments = await ghFetch(`/issues/${issue.number}/comments`);
    const triage = comments?.find(c => c.body?.includes('Automated Triage') || c.body?.includes('## Triage'));

    candidates = parseHotelCandidates(issue.body);
    console.log(`  Parsed ${candidates.length} hotel candidate(s) from issue body.`);

    if (triage) {
      console.log('  Triage comment found — using for priority filtering.');
    }
  } else {
    console.log('  Manual mode — no auto-fetch. Use --auto to read from hotel-refresh issue.');
    return;
  }

  // Filter candidates: dedup against existing, match site cities
  const siteCities = Object.keys(cfg.hotels || {});
  const newHotels = candidates.filter(h => {
    if (existingIds.has(h.id)) {
      console.log(`  Skip ${h.id} (${h.name}): already in config`);
      return false;
    }
    if (h.city && !siteCities.includes(h.city)) {
      console.log(`  Skip ${h.id} (${h.name}): city "${h.city}" not in ${SITE}`);
      return false;
    }
    return true;
  }).slice(0, 3); // Take top 3

  if (newHotels.length === 0) {
    console.log('\n  No new hotels to add after filtering.');
    return;
  }

  console.log(`\n  Adding ${newHotels.length} hotel(s):`);
  for (const h of newHotels) {
    const city = h.city || siteCities[0];
    if (!cfg.hotels[city]) cfg.hotels[city] = [];

    const hotelEntry = {
      id: h.id,
      name: h.name,
      emoji: h.emoji || '🏨',
      area: h.area || '',
      dist: h.dist || '',
      desc: h.desc || `${h.stars || 5}★ hotel.`,
      tags: h.tags || [],
      badge: h.badge || null
    };

    cfg.hotels[city].push(hotelEntry);
    console.log(`  + ${h.name} (${h.id}) → ${city}`);
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would write config and create PR.');
    console.log(`  Config would have ${Object.values(cfg.hotels).flat().length} total hotels.`);
    return;
  }

  // Write updated config
  writeJSON(cfgPath, cfg);
  console.log(`\n  ✓ Updated config: ${SITE}.json`);

  // Create branch and PR
  const date = new Date().toISOString().slice(0, 10);
  const branch = `auto/hotel-add-${SITE}-${date}`;
  const hotelNames = newHotels.map(h => h.name).join(', ');

  try {
    execSync(`git checkout -b ${branch}`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git add generator/configs/${SITE}.json`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "feat: add ${newHotels.length} hotel(s) to ${SITE}\n\nHotels: ${hotelNames}"`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git push -u origin ${branch}`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`  ✓ Pushed branch: ${branch}`);
  } catch (e) {
    console.error(`  ⚠ Git operations failed: ${e.message}`);
    // Restore main branch
    try { execSync('git checkout main', { cwd: ROOT, stdio: 'pipe' }); } catch {}
    return;
  }

  // Create draft PR
  const prBody = `## Auto Hotel Addition

**Site:** ${SITE}
**Source:** hotel-refresh issue${issueNumber ? ` #${issueNumber}` : ''}
**Hotels added:** ${newHotels.length}

${newHotels.map(h => `- **${h.name}** (\`${h.id}\`) → ${h.city || 'default city'}`).join('\n')}

---

*Auto-generated by \`hotel-add.js\`. Review hotels and merge to deploy.*

<!-- machine: ${JSON.stringify({ action: 'hotel_add', site: SITE, count: newHotels.length, hotel_ids: newHotels.map(h => h.id) })} -->`;

  try {
    const pr = await fetch(`${GH_API}/repos/${GH_REPO}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `feat: add ${newHotels.length} hotel(s) to ${SITE}`,
        body: prBody,
        head: branch,
        base: 'main',
        draft: true
      })
    });
    const prData = await pr.json();
    console.log(`  ✓ Draft PR created: ${prData.html_url || prData.url}`);

    // Add labels
    if (prData.number) {
      await fetch(`${GH_API}/repos/${GH_REPO}/issues/${prData.number}/labels`, {
        method: 'POST',
        headers: { Authorization: `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: ['hotel-refresh', 'auto-generated'] })
      }).catch(() => {});
    }
  } catch (e) {
    console.error(`  ⚠ PR creation failed: ${e.message}`);
  }

  // Restore main branch
  try { execSync('git checkout main', { cwd: ROOT, stdio: 'pipe' }); } catch {}

  // Log to history
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'decision',
    timestamp: new Date().toISOString(),
    action: 'hotel_add_pr',
    site: SITE,
    hotels: newHotels.map(h => ({ id: h.id, name: h.name, city: h.city })),
    issue_number: issueNumber
  });
  writeJSON(HISTORY_FILE, history);

  console.log(`\n✅  Hotel add complete. Draft PR created for review.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
