#!/usr/bin/env node
/**
 * autoresearch/eval-variants.js — PromptFoo-style Quality Gate
 *
 * Evaluates generated copy/SEO variants before deployment.
 * Rejects variants that are:
 *   - Too similar to each other (cosine similarity > 0.85)
 *   - Off-brand (missing key brand signals)
 *   - Factually wrong (incorrect claims)
 *   - Too short or too long
 *
 * Can be called as a module or CLI:
 *   node autoresearch/eval-variants.js --file variants.json
 *   const { evalVariants } = require('./eval-variants');
 *
 * Returns pass/fail per variant with reasons.
 *
 * Optional env vars:
 *   ANTHROPIC_API_KEY — for AI-powered factual checking (falls back to rule-based)
 */

const fs   = require('fs');
const path = require('path');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// ── Brand rules ──────────────────────────────────────────────
// These are the invariants every variant must respect
const BRAND_RULES = {
  // Required phrases/concepts (at least N must appear)
  required_signals: {
    min_count: 2,
    signals: [
      'member', 'cug', 'closed user group', 'member rate', 'member price',
      'save', 'saving', 'below', 'cheaper', 'discount',
      'booking.com', 'expedia', 'hotels.com', 'ota',
      'free', 'no subscription', 'no credit card',
      'live rate', 'real time', 'live pric'
    ]
  },
  // Banned phrases — these should never appear
  banned_phrases: [
    'guaranteed lowest', 'cheapest on the internet', 'best price guarantee',
    'risk free', 'no risk', '100% satisfaction',
    'limited time only', 'act now', 'don\'t miss out',
    'exclusive deal', 'once in a lifetime',
    'we are the best', 'we are number one', '#1',
    'click here', 'buy now',
    // Legal/compliance
    'investment', 'financial advice', 'guaranteed return'
  ],
  // Length constraints (character count)
  copy_length: {
    hero_h1: { min: 15, max: 80 },
    hero_sub: { min: 40, max: 250 },
    modal_headline: { min: 10, max: 60 },
    seo_title: { min: 20, max: 65 },
    seo_description: { min: 60, max: 160 }
  }
};

// ── Similarity detection (basic token overlap) ───────────────
function tokenize(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ── Rule-based evaluation ────────────────────────────────────
function evalCopyVariant(variant, type = 'copy') {
  const issues = [];
  const warnings = [];

  // Collect all text fields to check
  const allText = Object.values(variant)
    .filter(v => typeof v === 'string')
    .join(' ')
    .toLowerCase();

  // 1. Brand signal check
  const matchedSignals = BRAND_RULES.required_signals.signals
    .filter(sig => allText.includes(sig));
  if (matchedSignals.length < BRAND_RULES.required_signals.min_count) {
    issues.push(`Off-brand: only ${matchedSignals.length}/${BRAND_RULES.required_signals.min_count} brand signals found (${matchedSignals.join(', ') || 'none'})`);
  }

  // 2. Banned phrase check
  for (const phrase of BRAND_RULES.banned_phrases) {
    if (allText.includes(phrase.toLowerCase())) {
      issues.push(`Banned phrase detected: "${phrase}"`);
    }
  }

  // 3. Length checks based on type
  if (type === 'copy') {
    const fields = {
      HERO_H1: variant.HERO_H1 || variant.hero_h1,
      HERO_SUB: variant.HERO_SUB || variant.hero_sub,
      MODAL_HEADLINE: variant.MODAL_HEADLINE || variant.modal_headline,
    };
    for (const [key, val] of Object.entries(fields)) {
      if (!val) continue;
      const rule = BRAND_RULES.copy_length[key.toLowerCase()];
      if (!rule) continue;
      if (val.length < rule.min) issues.push(`${key} too short: ${val.length} chars (min: ${rule.min})`);
      if (val.length > rule.max) warnings.push(`${key} long: ${val.length} chars (max: ${rule.max})`);
    }
  }

  if (type === 'seo') {
    const titleLen = (variant.title || '').length;
    const descLen  = (variant.description || '').length;
    const titleRule = BRAND_RULES.copy_length.seo_title;
    const descRule  = BRAND_RULES.copy_length.seo_description;

    if (titleLen < titleRule.min) issues.push(`Title too short: ${titleLen} chars`);
    if (titleLen > titleRule.max) warnings.push(`Title long: ${titleLen} chars (may truncate in SERP)`);
    if (descLen < descRule.min) issues.push(`Description too short: ${descLen} chars`);
    if (descLen > descRule.max) warnings.push(`Description long: ${descLen} chars (may truncate)`);
  }

  // 4. Check for obviously wrong factual claims
  const factChecks = [
    { pattern: /save.*(\d{2,3})%/i, validate: (match) => {
      const pct = parseInt(match[1]);
      return pct <= 40; // We claim 10-30%, anything over 40% is suspicious
    }, error: 'Suspicious savings claim — we guarantee 10-30%, not higher' },
    { pattern: /(\d+)\s*hotels?/i, validate: (match) => {
      const count = parseInt(match[1]);
      return count <= 500; // We don't have thousands
    }, error: 'Hotel count claim seems inflated' },
  ];

  for (const check of factChecks) {
    const match = allText.match(check.pattern);
    if (match && !check.validate(match)) {
      issues.push(check.error);
    }
  }

  return {
    pass: issues.length === 0,
    issues,
    warnings,
    brand_signal_count: matchedSignals.length
  };
}

// ── AI-powered evaluation (when API key available) ───────────
async function evalWithClaude(variants, type, siteName) {
  if (!ANTHROPIC_KEY) return null;

  const prompt = `You are a quality reviewer for ${siteName || 'a luxury hotel booking platform'} that uses Closed User Group (CUG) member rates.

Review these ${type} variants for quality issues. Check for:
1. Factual accuracy (savings are 10-30%, membership is free, rates are live from API)
2. Brand consistency (authoritative but warm tone, not salesy or scammy)
3. Uniqueness (variants should test genuinely different angles, not rephrased copies)
4. Compliance (no guarantee language, no "best price" claims, no urgency manipulation)

Variants:
${JSON.stringify(variants, null, 2)}

For each variant, respond with JSON only — an array of objects:
[{ "index": 0, "pass": true/false, "issues": ["issue1"], "quality_score": 1-10 }]`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content[0].text;
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ── Main evaluation function (exported) ──────────────────────
async function evalVariants(variants, options = {}) {
  const { type = 'copy', siteName = null, strict = false } = options;

  console.log(`\n🔍  Evaluating ${variants.length} ${type} variant(s)...\n`);

  const results = [];

  // Step 1: Rule-based eval per variant
  for (let i = 0; i < variants.length; i++) {
    const result = evalCopyVariant(variants[i], type);
    results.push({ index: i, ...result });
    const status = result.pass ? '✓' : '✗';
    console.log(`  ${status} Variant ${i + 1}: ${result.issues.length} issues, ${result.warnings.length} warnings`);
    if (result.issues.length) result.issues.forEach(iss => console.log(`    ✗ ${iss}`));
    if (result.warnings.length) result.warnings.forEach(w => console.log(`    ⚠ ${w}`));
  }

  // Step 2: Cross-variant similarity check
  console.log('\n  Similarity check:');
  const SIMILARITY_THRESHOLD = 0.70; // Jaccard — lower than cosine
  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      const textI = Object.values(variants[i]).filter(v => typeof v === 'string').join(' ');
      const textJ = Object.values(variants[j]).filter(v => typeof v === 'string').join(' ');
      const sim = jaccardSimilarity(textI, textJ);
      if (sim > SIMILARITY_THRESHOLD) {
        const msg = `Variants ${i + 1} & ${j + 1} too similar (${(sim * 100).toFixed(0)}% overlap)`;
        console.log(`    ✗ ${msg}`);
        results[i].issues.push(msg);
        results[i].pass = false;
        results[j].issues.push(msg);
        results[j].pass = false;
      } else {
        console.log(`    ✓ Variants ${i + 1} & ${j + 1}: ${(sim * 100).toFixed(0)}% overlap (OK)`);
      }
    }
  }

  // Step 3: AI-powered eval (optional, if API key available)
  const aiResults = await evalWithClaude(variants, type, siteName);
  if (aiResults) {
    console.log('\n  AI quality review:');
    for (const aiResult of aiResults) {
      const idx = aiResult.index;
      if (idx >= 0 && idx < results.length) {
        results[idx].ai_quality_score = aiResult.quality_score;
        if (!aiResult.pass) {
          results[idx].pass = false;
          for (const issue of (aiResult.issues || [])) {
            results[idx].issues.push(`[AI] ${issue}`);
          }
        }
        console.log(`    Variant ${idx + 1}: score ${aiResult.quality_score}/10 ${aiResult.pass ? '✓' : '✗'}`);
      }
    }
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`\n  ── Summary: ${passed} passed, ${failed} failed out of ${variants.length} ──\n`);

  // In strict mode, ALL must pass. In normal mode, at least 1 must pass.
  const gatePass = strict ? failed === 0 : passed > 0;

  return {
    gate_pass: gatePass,
    total: variants.length,
    passed,
    failed,
    results,
    ai_available: !!aiResults
  };
}

// ── CLI mode ─────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };

  const variantFile = getArg('--file', null);
  const type        = getArg('--type', 'copy');
  const siteName    = getArg('--site', null);
  const strict      = args.includes('--strict');

  if (!variantFile) {
    console.log('Usage: node autoresearch/eval-variants.js --file <variants.json> [--type copy|seo] [--site <name>] [--strict]');
    console.log('\nVariants JSON should be an array of objects with copy fields (HERO_H1, etc.) or SEO fields (title, description).');
    process.exit(0);
  }

  const variants = JSON.parse(fs.readFileSync(variantFile, 'utf8'));

  evalVariants(variants, { type, siteName, strict }).then(result => {
    if (!result.gate_pass) {
      console.error('❌ Quality gate FAILED — variants not safe to deploy.');
      process.exit(1);
    }
    console.log('✅ Quality gate passed.');
  }).catch(e => {
    console.error('❌', e.message);
    process.exit(1);
  });
}

module.exports = { evalVariants, evalCopyVariant, jaccardSimilarity, BRAND_RULES };
