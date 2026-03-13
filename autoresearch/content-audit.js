#!/usr/bin/env node
/**
 * autoresearch/content-audit.js — Content Differentiation Auditor
 *
 * Scans all generated pages (main sites + SEO pages) and measures pairwise
 * text similarity. Flags pages that fall below the differentiation threshold.
 *
 * Google's December 2025 update penalises sites with <30% unique content
 * per page. This script enforces a stricter 40% floor (the "40% Rule"
 * from STRATEGY-PACK.md — every page must have ≥40% unique data not
 * available on competitor sites or sibling pages).
 *
 * Outputs:
 *   - content-audit.json  (machine-readable results)
 *   - GitHub issue         (if threshold violations found)
 *   - Console report       (always)
 *
 * Usage:
 *   node autoresearch/content-audit.js                  (full audit)
 *   node autoresearch/content-audit.js --dry-run        (no GitHub issue)
 *   node autoresearch/content-audit.js --site luxstay   (single site)
 *   node autoresearch/content-audit.js --threshold 0.35 (custom threshold)
 *
 * Required env vars (for GitHub issue creation):
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 */

const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const SITES_DIR   = path.join(ROOT, 'sites');
const AUDIT_FILE  = path.join(__dirname, 'content-audit.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GH_REPO  = process.env.GITHUB_REPOSITORY || '';
const GH_API   = 'https://api.github.com';

// CLI
const args      = process.argv.slice(2);
const getArg    = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const DRY_RUN   = args.includes('--dry-run');
const SITE      = getArg('--site', null);
const THRESHOLD = parseFloat(getArg('--threshold', '0.40'));

// ── Text extraction ──────────────────────────────────────────
function extractVisibleText(html) {
  // Strip script, style, SVG, and head tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Normalise whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ── Tokenisation ─────────────────────────────────────────────
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// ── Similarity metrics ───────────────────────────────────────
function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// N-gram overlap gives a stricter similarity measure than Jaccard on single tokens
function ngramOverlap(tokensA, tokensB, n = 3) {
  if (tokensA.length < n || tokensB.length < n) return 0;

  const makeNgrams = (tokens) => {
    const ngrams = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  };

  const ngramsA = makeNgrams(tokensA);
  const ngramsB = makeNgrams(tokensB);
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;

  const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
  const union = new Set([...ngramsA, ...ngramsB]);
  return intersection.size / union.size;
}

// Combined differentiation score: weighted average of Jaccard and 3-gram
// Higher = MORE similar = LESS differentiated
function similarityScore(tokensA, tokensB) {
  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const ngram   = ngramOverlap(tokensA, tokensB, 3);
  // 3-gram overlap is a stricter measure; weight it more heavily
  return 0.4 * jaccard + 0.6 * ngram;
}

// ── Discover all generated HTML pages ────────────────────────
function discoverPages() {
  const pages = [];

  if (!fs.existsSync(SITES_DIR)) {
    console.log('  No sites/ directory found.');
    return pages;
  }

  const entries = fs.readdirSync(SITES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SITE && !entry.name.startsWith(SITE)) continue;

    const siteDir = path.join(SITES_DIR, entry.name);
    const htmlFiles = findHtmlFiles(siteDir);

    for (const htmlFile of htmlFiles) {
      const relPath = path.relative(SITES_DIR, htmlFile);
      const siteName = entry.name.split('-v')[0]; // Strip variant suffix
      pages.push({
        site: siteName,
        folder: entry.name,
        path: htmlFile,
        relPath,
        slug: relPath.replace(/\/index\.html$/, '').replace(/\.html$/, '')
      });
    }
  }

  return pages;
}

function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── GitHub issue ─────────────────────────────────────────────
async function createIssue(audit) {
  if (!GH_TOKEN || !GH_REPO) return;

  const violations = audit.pairs.filter(p => p.differentiation < THRESHOLD);
  const pageScores = audit.page_scores.filter(p => p.min_differentiation < THRESHOLD);

  const violationRows = violations
    .slice(0, 20) // Cap at 20 rows
    .map(p => `| ${p.page_a_slug} | ${p.page_b_slug} | ${(p.similarity * 100).toFixed(0)}% | ${(p.differentiation * 100).toFixed(0)}% | ⚠ |`)
    .join('\n');

  const pageRows = pageScores
    .slice(0, 15)
    .map(p => `| ${p.site} | ${p.slug} | ${(p.min_differentiation * 100).toFixed(0)}% | ${p.most_similar_to} |`)
    .join('\n');

  const body = `## Content Differentiation Audit — ${new Date().toISOString().slice(0, 10)}

### Summary
- **Pages audited:** ${audit.total_pages}
- **Pairs compared:** ${audit.total_pairs}
- **Violations (<${(THRESHOLD * 100).toFixed(0)}% differentiation):** ${violations.length}
- **Pages at risk:** ${pageScores.length}
- **Threshold:** ${(THRESHOLD * 100).toFixed(0)}% unique content required

### Pages Below Threshold
| Site | Page | Min Differentiation | Most Similar To |
|------|------|---------------------|-----------------|
${pageRows || '(none)'}

### Pairwise Violations
| Page A | Page B | Similarity | Differentiation | Status |
|--------|--------|------------|-----------------|--------|
${violationRows || '(none)'}

### Recommended Actions
${pageScores.length > 0 ? pageScores.slice(0, 5).map(p =>
  `- **${p.slug}**: Add unique data (local tips, proprietary rate data, exclusive reviews) to increase differentiation from ${p.most_similar_to}`
).join('\n') : '- All pages meet the differentiation threshold.'}

<!-- machine: ${JSON.stringify({
    action_needed: violations.length > 0,
    violations: violations.length,
    pages_at_risk: pageScores.length,
    threshold: THRESHOLD,
    worst_pair: violations[0] ? { a: violations[0].page_a_slug, b: violations[0].page_b_slug, diff: violations[0].differentiation } : null
  })} -->`;

  try {
    const res = await fetch(`${GH_API}/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `Content Audit: ${violations.length} page pairs below ${(THRESHOLD * 100).toFixed(0)}% differentiation [${new Date().toISOString().slice(0, 10)}]`,
        body,
        labels: ['content-audit', 'auto-generated']
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
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n📝  Content Differentiation Audit${SITE ? `: ${SITE}` : ' (all sites)'}`);
  console.log(`    Threshold: ${(THRESHOLD * 100).toFixed(0)}% unique content required\n`);

  // Discover pages
  const pages = discoverPages();
  console.log(`  Found ${pages.length} HTML pages.\n`);

  if (pages.length < 2) {
    console.log('  Need at least 2 pages to compare. Exiting.');
    return;
  }

  // Extract and tokenize text from each page
  console.log('  Extracting text and tokenizing...');
  const pageData = [];
  for (const page of pages) {
    try {
      const html = fs.readFileSync(page.path, 'utf8');
      const text = extractVisibleText(html);
      const tokens = tokenize(text);
      pageData.push({ ...page, text, tokens, wordCount: tokens.length });
      process.stdout.write('.');
    } catch (e) {
      console.log(`  ⚠ Could not read ${page.relPath}: ${e.message}`);
    }
  }
  console.log(` Done (${pageData.length} pages processed)\n`);

  // Pairwise comparison
  console.log('  Running pairwise similarity analysis...');
  const pairs = [];
  let violations = 0;

  for (let i = 0; i < pageData.length; i++) {
    for (let j = i + 1; j < pageData.length; j++) {
      const a = pageData[i];
      const b = pageData[j];

      // Skip variant vs control comparisons (they're supposed to differ)
      if (a.folder.match(/-v\d+$/) || b.folder.match(/-v\d+$/)) continue;

      const sim = similarityScore(a.tokens, b.tokens);
      const diff = 1 - sim;

      pairs.push({
        page_a: a.relPath,
        page_a_slug: a.slug,
        page_b: b.relPath,
        page_b_slug: b.slug,
        similarity: Math.round(sim * 1000) / 1000,
        differentiation: Math.round(diff * 1000) / 1000
      });

      if (diff < THRESHOLD) {
        violations++;
      }
    }
  }

  // Sort pairs by similarity (highest first = worst)
  pairs.sort((a, b) => b.similarity - a.similarity);

  // Per-page scores: each page's minimum differentiation from any other page
  const pageScores = pageData.map(page => {
    const pagePairs = pairs.filter(p =>
      p.page_a === page.relPath || p.page_b === page.relPath
    );
    if (pagePairs.length === 0) return { ...page, min_differentiation: 1, most_similar_to: 'n/a' };

    const worstPair = pagePairs.reduce((worst, p) =>
      p.differentiation < worst.differentiation ? p : worst
    );

    const mostSimilarTo = worstPair.page_a === page.relPath
      ? worstPair.page_b_slug
      : worstPair.page_a_slug;

    return {
      site: page.site,
      slug: page.slug,
      wordCount: page.wordCount,
      min_differentiation: worstPair.differentiation,
      most_similar_to: mostSimilarTo
    };
  }).sort((a, b) => a.min_differentiation - b.min_differentiation);

  // Console report
  console.log(`\n  ── Results ────────────────────────────────────────\n`);
  console.log(`  Pages audited:  ${pageData.length}`);
  console.log(`  Pairs compared: ${pairs.length}`);
  console.log(`  Violations:     ${violations} pairs below ${(THRESHOLD * 100).toFixed(0)}% differentiation`);

  if (violations > 0) {
    console.log(`\n  ⚠ Pages below threshold:`);
    const atRisk = pageScores.filter(p => p.min_differentiation < THRESHOLD);
    for (const p of atRisk.slice(0, 10)) {
      console.log(`    ${p.slug.padEnd(40)} ${(p.min_differentiation * 100).toFixed(0)}% diff (most similar to: ${p.most_similar_to})`);
    }
  }

  // Top 5 most similar pairs
  console.log(`\n  Most similar pairs:`);
  for (const p of pairs.slice(0, 5)) {
    const status = p.differentiation < THRESHOLD ? '⚠' : '✓';
    console.log(`    ${status} ${p.page_a_slug} ↔ ${p.page_b_slug}: ${(p.similarity * 100).toFixed(0)}% similar (${(p.differentiation * 100).toFixed(0)}% unique)`);
  }

  // Pages with highest differentiation (the good ones)
  const bestPages = [...pageScores].sort((a, b) => b.min_differentiation - a.min_differentiation);
  console.log(`\n  Most differentiated pages:`);
  for (const p of bestPages.slice(0, 5)) {
    console.log(`    ✓ ${p.slug.padEnd(40)} ${(p.min_differentiation * 100).toFixed(0)}% unique`);
  }

  // Write audit file
  const audit = {
    timestamp: new Date().toISOString(),
    threshold: THRESHOLD,
    total_pages: pageData.length,
    total_pairs: pairs.length,
    violations,
    page_scores: pageScores,
    pairs: pairs.slice(0, 50) // Keep top 50 most similar pairs
  };
  writeJSON(AUDIT_FILE, audit);
  console.log(`\n  ✓ Audit saved to content-audit.json`);

  // GitHub issue
  if (!DRY_RUN && violations > 0) {
    console.log('\n  Creating content-audit issue...');
    await createIssue(audit);
  } else if (DRY_RUN) {
    console.log(`\n  [DRY RUN] Would create GitHub issue (${violations} violations).`);
  } else {
    console.log('\n  No violations — no issue needed.');
  }

  // Log to history
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'observation',
    timestamp: new Date().toISOString(),
    observation: `Content audit: ${pageData.length} pages, ${violations} pairs below ${(THRESHOLD * 100).toFixed(0)}% differentiation threshold`,
    source: 'content-audit'
  });
  writeJSON(HISTORY_FILE, history);

  console.log(`\n✅  Content audit complete.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
