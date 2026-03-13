#!/usr/bin/env node
/**
 * autoresearch/microfish-swarm.js — MicroFish Content Differentiation Swarm
 *
 * Reads content-audit.json, identifies pages below the differentiation threshold,
 * generates unique data blocks via differentiation-injector.js, injects them into
 * the existing HTML pages, re-scores the result, and reports before/after metrics.
 *
 * The "MicroFish" approach: batch-test many small content changes in parallel,
 * measure which combinations lift differentiation above threshold, and only
 * deploy the winners. This is Google's December 2025 penalty simulation.
 *
 * Pipeline:
 *   1. Read content-audit.json → sort pages by worst differentiation
 *   2. For each page below threshold:
 *      a. Parse page type (city/region/amenity) from slug + config
 *      b. Generate differentiation blocks (rate insights, seasonal, local intel, etc.)
 *      c. Inject blocks into existing HTML
 *      d. Re-extract text, re-tokenize, re-score against siblings
 *   3. Report: before/after diff scores, estimated lift, pass/fail
 *   4. Write results to microfish-results.json
 *   5. Optionally deploy passing variants (--deploy flag)
 *
 * Usage:
 *   node autoresearch/microfish-swarm.js                   (simulate only)
 *   node autoresearch/microfish-swarm.js --deploy          (inject + overwrite pages)
 *   node autoresearch/microfish-swarm.js --site luxstay    (single site)
 *   node autoresearch/microfish-swarm.js --top 5           (only fix top N worst pages)
 *   node autoresearch/microfish-swarm.js --threshold 0.35  (custom threshold)
 *
 * Required inputs:
 *   autoresearch/content-audit.json  (from content-audit.js)
 *   rate-snapshot.json               (from rate-monitor.js, optional but improves blocks)
 *   generator/configs/*.json         (site configs for hotel data)
 */

const fs   = require('fs');
const path = require('path');

const { generateDiffBlocks, DIFF_BLOCK_CSS } = require('./differentiation-injector');

const ROOT         = path.join(__dirname, '..');
const SITES_DIR    = path.join(ROOT, 'sites');
const CONFIGS_DIR  = path.join(ROOT, 'generator', 'configs');
const AUDIT_FILE   = path.join(__dirname, 'content-audit.json');
const RESULTS_FILE = path.join(__dirname, 'microfish-results.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

// CLI
const args      = process.argv.slice(2);
const getArg    = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const DEPLOY    = args.includes('--deploy');
const SITE      = getArg('--site', null);
const TOP_N     = parseInt(getArg('--top', '50'), 10);
const THRESHOLD = parseFloat(getArg('--threshold', '0.40'));

// ── Text extraction (same as content-audit.js) ──────────────
function extractVisibleText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);
}

function similarityScore(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;

  // Jaccard
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  const jaccard = intersection.size / union.size;

  // 3-gram overlap
  const makeNgrams = (tokens, n = 3) => {
    const ngrams = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.add(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  };
  const nA = makeNgrams(tokensA);
  const nB = makeNgrams(tokensB);
  let ngram = 0;
  if (nA.size > 0 && nB.size > 0) {
    const nInt = new Set([...nA].filter(x => nB.has(x)));
    const nUni = new Set([...nA, ...nB]);
    ngram = nInt.size / nUni.size;
  }

  return 0.4 * jaccard + 0.6 * ngram;
}

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── Parse page type from slug and config ─────────────────────
function parsePageContext(slug, site) {
  const cfgPath = path.join(CONFIGS_DIR, `${site}.json`);
  if (!fs.existsSync(cfgPath)) return null;
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

  // Strip site prefix from slug
  const pageSlug = slug.replace(`${site}/`, '');

  // Check amenity pages
  if (cfg.seo_amenity_pages) {
    const amenityMatch = cfg.seo_amenity_pages.find(a => a.slug === pageSlug);
    if (amenityMatch) {
      return {
        type: 'amenity',
        slug: pageSlug,
        site,
        city: amenityMatch.city,
        amenity: amenityMatch.amenity,
        hotels: cfg.hotels?.[amenityMatch.city] || [],
        region: null
      };
    }
  }

  // Check region pages
  if (cfg.seo_regions) {
    const regionMatch = cfg.seo_regions.find(r => r.slug === pageSlug);
    if (regionMatch) {
      return {
        type: 'region',
        slug: pageSlug,
        site,
        city: regionMatch.city,
        amenity: null,
        hotels: cfg.hotels?.[regionMatch.city] || [],
        region: regionMatch
      };
    }
  }

  // Check city pages
  for (const cityObj of (cfg.cities || [])) {
    const citySlug = cityObj.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (pageSlug === citySlug) {
      return {
        type: 'city',
        slug: pageSlug,
        site,
        city: cityObj.value,
        amenity: null,
        hotels: cfg.hotels?.[cityObj.value] || [],
        region: null
      };
    }
  }

  // Fallback: infer city from slug
  const cities = Object.keys(cfg.hotels || {});
  const matchedCity = cities.find(c => pageSlug.toLowerCase().includes(c.toLowerCase().split(' ')[0]));
  if (matchedCity) {
    return {
      type: 'unknown',
      slug: pageSlug,
      site,
      city: matchedCity,
      amenity: null,
      hotels: cfg.hotels?.[matchedCity] || [],
      region: null
    };
  }

  return null;
}

// ── Inject diff blocks into HTML ─────────────────────────────
function injectBlocks(html, diffResult) {
  if (!diffResult?.injectedHTML) return html;

  // Inject CSS before </style> or before </head>
  const cssInjection = DIFF_BLOCK_CSS;
  if (html.includes('</style>')) {
    html = html.replace('</style>', cssInjection + '\n</style>');
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `<style>${cssInjection}</style>\n</head>`);
  }

  // Inject content blocks after the editorial section
  const editorialEnd = html.indexOf('</div>\n\n  <!-- Hotels -->');
  if (editorialEnd !== -1) {
    html = html.slice(0, editorialEnd) +
      `</div>\n\n  <!-- Differentiation blocks (MicroFish) -->\n  ${diffResult.injectedHTML}\n\n  <!-- Hotels -->` +
      html.slice(editorialEnd + '</div>\n\n  <!-- Hotels -->'.length);
  } else {
    // Fallback: inject before <!-- Mid-page CTA -->
    const ctaPos = html.indexOf('<!-- Mid-page CTA -->');
    if (ctaPos !== -1) {
      html = html.slice(0, ctaPos) +
        `<!-- Differentiation blocks (MicroFish) -->\n  ${diffResult.injectedHTML}\n\n  ` +
        html.slice(ctaPos);
    }
  }

  return html;
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🐟  MicroFish Swarm — Content Differentiation Fix`);
  console.log(`    Mode: ${DEPLOY ? 'DEPLOY (will overwrite pages)' : 'SIMULATE (read-only)'}`);
  console.log(`    Threshold: ${(THRESHOLD * 100).toFixed(0)}%${SITE ? ` | Site: ${SITE}` : ''} | Top: ${TOP_N}\n`);

  // 1. Read audit
  const audit = readJSON(AUDIT_FILE, null);
  if (!audit?.page_scores) {
    console.error('  ❌ No content-audit.json found. Run content-audit.js first.');
    process.exit(1);
  }

  // 2. Filter to pages below threshold
  let targets = audit.page_scores.filter(p => p.min_differentiation < THRESHOLD);
  if (SITE) targets = targets.filter(p => p.site === SITE);
  targets = targets.slice(0, TOP_N);

  console.log(`  Found ${targets.length} pages below ${(THRESHOLD * 100).toFixed(0)}% threshold.\n`);
  if (targets.length === 0) {
    console.log('  ✓ All pages meet threshold. Nothing to do.');
    return;
  }

  // 3. Load all sibling page tokens for re-scoring
  console.log('  Loading sibling pages for re-scoring...');
  const siblingTokens = {};
  const allPagePaths = audit.page_scores.map(p => {
    const htmlPath = path.join(SITES_DIR, p.slug, 'index.html');
    if (fs.existsSync(htmlPath)) return { slug: p.slug, path: htmlPath };
    const altPath = path.join(SITES_DIR, p.slug + '.html');
    if (fs.existsSync(altPath)) return { slug: p.slug, path: altPath };
    // Try the folder directly
    const dirPath = path.join(SITES_DIR, p.slug);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isFile()) return { slug: p.slug, path: dirPath };
    return null;
  }).filter(Boolean);

  for (const pg of allPagePaths) {
    try {
      const html = fs.readFileSync(pg.path, 'utf8');
      siblingTokens[pg.slug] = tokenize(extractVisibleText(html));
    } catch { /* skip */ }
  }
  console.log(`  Loaded ${Object.keys(siblingTokens).length} sibling pages.\n`);

  // 4. Process each target page
  const results = [];
  let improved = 0;
  let passed = 0;

  for (const target of targets) {
    process.stdout.write(`  🐟 ${target.slug.padEnd(50)}`);

    // Find HTML file
    let htmlPath = path.join(SITES_DIR, target.slug + '.html');
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.join(SITES_DIR, target.slug, 'index.html');
    }
    if (!fs.existsSync(htmlPath)) {
      console.log(' — file not found, skipping');
      continue;
    }

    const originalHtml = fs.readFileSync(htmlPath, 'utf8');
    const originalTokens = tokenize(extractVisibleText(originalHtml));

    // Parse page context
    const ctx = parsePageContext(target.slug, target.site);
    if (!ctx) {
      console.log(' — could not parse context, skipping');
      continue;
    }

    // Generate differentiation blocks
    const diffResult = await generateDiffBlocks(ctx);

    // Inject blocks
    const enhancedHtml = injectBlocks(originalHtml, diffResult);
    const enhancedTokens = tokenize(extractVisibleText(enhancedHtml));

    // Re-score against the most similar sibling
    const siblingSlug = target.most_similar_to;
    const sibTokens = siblingTokens[siblingSlug];

    let beforeDiff = target.min_differentiation;
    let afterDiff = beforeDiff;

    if (sibTokens) {
      const beforeSim = similarityScore(originalTokens, sibTokens);
      const afterSim = similarityScore(enhancedTokens, sibTokens);
      afterDiff = Math.round((1 - afterSim) * 1000) / 1000;
    }

    const lift = afterDiff - beforeDiff;
    const nowPasses = afterDiff >= THRESHOLD;
    if (afterDiff > beforeDiff) improved++;
    if (nowPasses) passed++;

    const status = nowPasses ? '✓' : afterDiff > beforeDiff ? '↑' : '—';
    console.log(` ${(beforeDiff * 100).toFixed(0)}% → ${(afterDiff * 100).toFixed(0)}% (${lift > 0 ? '+' : ''}${(lift * 100).toFixed(0)}%) ${status}`);

    // Deploy if requested and improved
    if (DEPLOY && afterDiff > beforeDiff) {
      fs.writeFileSync(htmlPath, enhancedHtml, 'utf8');
    }

    results.push({
      slug: target.slug,
      site: target.site,
      type: ctx.type,
      most_similar_to: target.most_similar_to,
      before: beforeDiff,
      after: afterDiff,
      lift,
      passes_threshold: nowPasses,
      blocks_injected: diffResult.blockCount,
      words_added: diffResult.totalWords,
      blocks: diffResult.blocks.map(b => ({ id: b.id, words: b.wordCount, uniqueness: b.uniqueness })),
      deployed: DEPLOY && afterDiff > beforeDiff
    });
  }

  // 5. Summary
  console.log(`\n  ── Summary ────────────────────────────────────────\n`);
  console.log(`  Pages processed:    ${results.length}`);
  console.log(`  Improved:           ${improved} (${results.length > 0 ? Math.round(improved / results.length * 100) : 0}%)`);
  console.log(`  Now passing (≥${(THRESHOLD * 100).toFixed(0)}%): ${passed} (${results.length > 0 ? Math.round(passed / results.length * 100) : 0}%)`);
  console.log(`  Deployed:           ${DEPLOY ? results.filter(r => r.deployed).length : 'N/A (simulation mode)'}`);

  const avgLift = results.length > 0
    ? results.reduce((s, r) => s + r.lift, 0) / results.length
    : 0;
  console.log(`  Average lift:       ${avgLift > 0 ? '+' : ''}${(avgLift * 100).toFixed(1)}%`);

  // Worst remaining
  const stillFailing = results.filter(r => !r.passes_threshold).sort((a, b) => a.after - b.after);
  if (stillFailing.length > 0) {
    console.log(`\n  Still below threshold (${stillFailing.length}):`);
    for (const r of stillFailing.slice(0, 5)) {
      console.log(`    ⚠ ${r.slug.padEnd(45)} ${(r.after * 100).toFixed(0)}% (need ${(THRESHOLD * 100).toFixed(0)}%)`);
    }
    if (stillFailing.length > 5) console.log(`    ... and ${stillFailing.length - 5} more`);
  }

  // 6. Write results
  const output = {
    timestamp: new Date().toISOString(),
    threshold: THRESHOLD,
    mode: DEPLOY ? 'deploy' : 'simulate',
    total_processed: results.length,
    improved,
    now_passing: passed,
    average_lift: Math.round(avgLift * 1000) / 1000,
    results
  };
  writeJSON(RESULTS_FILE, output);
  console.log(`\n  ✓ Results saved to microfish-results.json`);

  // 7. Log to history
  const history = readJSON(HISTORY_FILE, []);
  history.push({
    type: 'observation',
    timestamp: new Date().toISOString(),
    observation: `MicroFish swarm: ${results.length} pages processed, ${improved} improved, ${passed} now pass ${(THRESHOLD * 100).toFixed(0)}% threshold. Avg lift: ${(avgLift * 100).toFixed(1)}%`,
    source: 'microfish-swarm',
    mode: DEPLOY ? 'deploy' : 'simulate'
  });
  writeJSON(HISTORY_FILE, history);

  console.log(`\n✅  MicroFish swarm complete.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
