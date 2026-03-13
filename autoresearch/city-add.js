#!/usr/bin/env node
/**
 * autoresearch/city-add.js — New City/Niche Launch via Draft PR
 *
 * Reads the latest explore.js opportunity report, takes the top-ranked city,
 * clones an existing config as a template, generates city-specific copy via
 * Claude, queries LiteAPI for hotels, and creates a draft PR.
 *
 * Usage:
 *   node autoresearch/city-add.js --city Paris                 (explicit city)
 *   node autoresearch/city-add.js --city Paris --country FR    (with country code)
 *   node autoresearch/city-add.js --auto                       (read from explore issue)
 *   node autoresearch/city-add.js --city Paris --dry-run
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY
 *   LITEAPI_KEY        — for hotel discovery
 *   GH_TOKEN / GITHUB_TOKEN
 *   GITHUB_REPOSITORY
 */

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT         = path.join(__dirname, '..');
const CONFIGS_DIR  = path.join(ROOT, 'generator', 'configs');
const HISTORY_FILE = path.join(__dirname, 'history.json');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const LITEAPI_KEY   = process.env.LITEAPI_KEY || '';
const GH_TOKEN      = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const GH_REPO       = process.env.GITHUB_REPOSITORY || '';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const LITEAPI_BASE  = 'https://api.liteapi.travel/v3.0';
const GH_API        = 'https://api.github.com';

// ── CLI ──────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i+1] ? args[i+1] : d; };
const CITY    = getArg('--city', null);
const COUNTRY = getArg('--country', null);
const AUTO    = args.includes('--auto');
const DRY_RUN = args.includes('--dry-run');

if (!CITY && !AUTO) {
  console.error('Usage: node autoresearch/city-add.js --city <name> [--country <code>] [--dry-run]');
  console.error('       node autoresearch/city-add.js --auto [--dry-run]');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────
function readJSON(fp, fallback) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJSON(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function ghFetch(endpoint) {
  if (!GH_TOKEN || !GH_REPO) return null;
  const res = await fetch(`${GH_API}/repos/${GH_REPO}${endpoint}`, {
    headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  return res.ok ? res.json() : null;
}

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

async function searchHotels(city, countryCode) {
  if (!LITEAPI_KEY) return [];
  try {
    const params = new URLSearchParams({ cityName: city, countryCode: countryCode || '' });
    const res = await fetch(`${LITEAPI_BASE}/data/hotels?${params}`, {
      headers: { 'X-API-Key': LITEAPI_KEY }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || [])
      .filter(h => (h.starRating || 0) >= 4)
      .sort((a, b) => (b.starRating || 0) - (a.starRating || 0))
      .slice(0, 8);
  } catch {
    return [];
  }
}

// ── Parse explore issue for city recommendation ──────────────
function parseMachineBlock(body) {
  if (!body) return null;
  const m = body.match(/<!-- machine: ({[\s\S]*?}) -->/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// ── Choose template config ───────────────────────────────────
function chooseTemplate(niche) {
  const configs = fs.readdirSync(CONFIGS_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('-v'))
    .map(f => ({ name: path.basename(f, '.json'), cfg: readJSON(path.join(CONFIGS_DIR, f), {}) }));

  // Match niche: resort → maldives-escape, city-luxury → dubai-ultra, default → dubai-ultra
  if (niche === 'resort') {
    const resort = configs.find(c => c.name === 'maldives-escape');
    if (resort) return resort;
  }
  // Default to dubai-ultra as template
  return configs.find(c => c.name === 'dubai-ultra') || configs[0];
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  let cityName = CITY;
  let countryCode = COUNTRY;
  let niche = 'city-luxury';
  let score = 0;
  let issueNumber = null;

  if (AUTO) {
    console.log('\n🌍  City Add: auto-mode (reading latest explore issue)\n');
    const issues = await ghFetch('/issues?labels=opportunity&state=all&per_page=1&sort=created&direction=desc');
    if (!issues || issues.length === 0) {
      console.log('  No explore/opportunity issues found.');
      return;
    }
    const issue = issues[0];
    issueNumber = issue.number;
    const machine = parseMachineBlock(issue.body);
    if (!machine || !machine.top_city) {
      console.log('  No machine block or top_city found in issue.');
      return;
    }
    if ((machine.score || machine.top_score || 0) < 60) {
      console.log(`  Score too low (${machine.score || machine.top_score}) — minimum 60 required.`);
      return;
    }
    cityName = machine.top_city;
    countryCode = machine.country_code || null;
    niche = machine.niche || 'city-luxury';
    score = machine.score || machine.top_score || 0;
    console.log(`  Top city: ${cityName} (score: ${score}, niche: ${niche})`);
  } else {
    console.log(`\n🌍  City Add: ${cityName}${countryCode ? ` (${countryCode})` : ''}\n`);
  }

  // Check if city already exists in any config
  const existingConfigs = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'));
  for (const file of existingConfigs) {
    const cfg = readJSON(path.join(CONFIGS_DIR, file), {});
    if (cfg.hotels && cfg.hotels[cityName]) {
      console.log(`  ⚠ City "${cityName}" already exists in ${file}`);
      return;
    }
  }

  const slug = slugify(cityName);
  const siteSlug = `${slug}-luxury`;

  // Choose template to clone
  const template = chooseTemplate(niche);
  console.log(`  Using template: ${template.name}`);

  // Generate city-specific copy via Claude
  console.log('  Generating copy via Claude...');
  let copyFields;
  try {
    const prompt = `Generate all copy fields for a luxury hotel booking website targeting ${cityName}${countryCode ? ` (${countryCode})` : ''}.

The site is a members-only platform offering exclusive hotel rates 10-30% below public booking sites.

Return a JSON object with these exact fields:
- BRAND_NAME: short brand name for this city site (e.g. "Dubai Ultra", "Maldives Escape")
- META_TITLE: SEO title under 60 chars
- META_DESCRIPTION: SEO description under 155 chars
- HERO_EYEBROW: short uppercase eyebrow text (e.g. "5-Star Hotels · Members Save 10–30%")
- HERO_H1: punchy headline under 12 words
- HERO_SUB: 1-2 sentence subheading
- MODAL_HEADLINE: join modal headline
- MODAL_SUB: join modal subheading
- MODAL_SUCCESS_TEXT: shown after joining
- FOOTER_TAGLINE: short tagline
- editorial: { title: string, paragraphs: [3 paragraphs about CUG member pricing for this destination] }
- faq_items: [5 objects with "q" and "a" keys, relevant to ${cityName} luxury hotels]
- trust_items: [4 short trust signals as strings]
- modal_perks: [4 objects with "icon" (emoji) and "text" keys]

Style: sophisticated, exclusive, factual. Not discount-y or cheap-sounding.
Return ONLY valid JSON, no markdown.`;

    const raw = await callClaude(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    copyFields = JSON.parse(jsonMatch[0]);
    console.log(`  ✓ Generated copy: "${copyFields.HERO_H1}"`);
  } catch (e) {
    console.error(`  ❌ Copy generation failed: ${e.message}`);
    process.exit(1);
  }

  // Search LiteAPI for hotels
  console.log(`  Searching LiteAPI for hotels in ${cityName}...`);
  const apiHotels = await searchHotels(cityName, countryCode);
  console.log(`  Found ${apiHotels.length} hotel(s) from LiteAPI.`);

  // Build hotel config entries
  const hotelEntries = apiHotels.map(h => ({
    id: h.id || h.hotelId || '',
    name: h.name || '',
    emoji: '🏨',
    area: h.address?.city || cityName,
    dist: '',
    desc: `${h.starRating || 5}★ hotel${h.address?.line1 ? ' at ' + h.address.line1 : ''}.`,
    tags: [h.starRating ? `${h.starRating}★` : '5★'].filter(Boolean),
    badge: null
  })).filter(h => h.id && h.name);

  // Build new config from template
  const newCfg = {
    ...template.cfg,
    _note: `Auto-generated city config for ${cityName}. Review and edit before merging.`,
    skip_deploy: false,
    ...copyFields,
    SCHEMA_NAME: copyFields.BRAND_NAME || `${cityName} Luxury`,
    SCHEMA_URL: `https://${siteSlug}.workers.dev`,
    SCHEMA_DESCRIPTION: copyFields.META_DESCRIPTION || '',
    COLOR_PRIMARY: template.cfg.COLOR_PRIMARY || '#1a2744',
    COLOR_ACCENT: template.cfg.COLOR_ACCENT || '#c9a84c',
    COLOR_ACCENT_LT: template.cfg.COLOR_ACCENT_LT || '#f5e9c8',
    CONTACT_EMAIL: template.cfg.CONTACT_EMAIL || '',
    GOOGLE_CLIENT_ID: template.cfg.GOOGLE_CLIENT_ID || '',
    MARKUP: template.cfg.MARKUP || '0.15',
    MIN_SAVING: template.cfg.MIN_SAVING || '0.08',
    DEFAULT_CITY: cityName,
    FORM_NAME: `${siteSlug}-members`,
    cities: [{ value: cityName, label: `${cityName}${countryCode ? ', ' + countryCode : ''}` }],
    hotels: { [cityName]: hotelEntries },
    seo_regions: [],
    seo_amenity_pages: []
  };

  // Remove template-specific fields
  delete newCfg.netlify_site_id;
  delete newCfg.NETLIFY_FORM_NAME;
  delete newCfg.GSC_VERIFICATION;
  delete newCfg.SITE_URL;
  delete newCfg.EMAILJS_PUBLIC_KEY;
  delete newCfg.EMAILJS_SERVICE_ID;
  delete newCfg.EMAILJS_TEMPLATE_ID;
  delete newCfg.AFFILIATE_NAV_LINK;
  delete newCfg.AFFILIATE_NAV_TEXT;
  delete newCfg.ENABLE_REFERRALS;

  console.log(`\n  New config: ${siteSlug}.json`);
  console.log(`  Brand: ${newCfg.BRAND_NAME}`);
  console.log(`  Hotels: ${hotelEntries.length}`);
  console.log(`  Headline: "${newCfg.HERO_H1}"`);

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would write config, generate site, and create PR.');
    return;
  }

  // Write config
  const cfgPath = path.join(CONFIGS_DIR, `${siteSlug}.json`);
  writeJSON(cfgPath, newCfg);
  console.log(`  ✓ Config written: ${siteSlug}.json`);

  // Generate site to verify
  console.log('  Generating site to verify...');
  try {
    execSync(`node generator/generate.js ${siteSlug}`, { stdio: 'pipe', cwd: ROOT });
    const htmlPath = path.join(ROOT, 'sites', siteSlug, 'index.html');
    const htmlSize = fs.statSync(htmlPath).size;
    if (htmlSize < 10000) throw new Error(`Generated HTML too small (${htmlSize} bytes)`);
    console.log(`  ✓ Site generated: ${htmlSize} bytes`);
  } catch (e) {
    console.error(`  ❌ Generation failed: ${e.message}`);
    // Clean up
    try { fs.unlinkSync(cfgPath); } catch {}
    process.exit(1);
  }

  // Create branch and PR
  const date = new Date().toISOString().slice(0, 10);
  const branch = `auto/city-add-${slug}-${date}`;

  try {
    execSync(`git checkout -b ${branch}`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git add generator/configs/${siteSlug}.json`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "feat: add ${cityName} luxury hotel site\n\n${hotelEntries.length} hotels, copy generated by Claude"`, { cwd: ROOT, stdio: 'pipe' });
    execSync(`git push -u origin ${branch}`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`  ✓ Pushed branch: ${branch}`);
  } catch (e) {
    console.error(`  ⚠ Git operations failed: ${e.message}`);
    try { execSync('git checkout main', { cwd: ROOT, stdio: 'pipe' }); } catch {}
    return;
  }

  // Create draft PR
  const prBody = `## New City Launch: ${cityName}

**Site slug:** ${siteSlug}
**Hotels:** ${hotelEntries.length}
**Source:** ${AUTO ? `explore issue #${issueNumber} (score: ${score})` : 'manual'}
**Copy:** Generated by Claude, needs human review

### Hotels
${hotelEntries.map(h => `- **${h.name}** (\`${h.id}\`)`).join('\n')}

### Headline
> ${newCfg.HERO_H1}

---

*Auto-generated by \`city-add.js\`. Review copy quality, hotel selection, and branding before merging.*

<!-- machine: ${JSON.stringify({ action: 'city_add', city: cityName, slug: siteSlug, hotel_count: hotelEntries.length, score })} -->`;

  try {
    const pr = await fetch(`${GH_API}/repos/${GH_REPO}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `feat: launch ${cityName} luxury hotel site`,
        body: prBody,
        head: branch,
        base: 'main',
        draft: true
      })
    });
    const prData = await pr.json();
    console.log(`  ✓ Draft PR created: ${prData.html_url || prData.url}`);

    if (prData.number) {
      await fetch(`${GH_API}/repos/${GH_REPO}/issues/${prData.number}/labels`, {
        method: 'POST',
        headers: { Authorization: `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: ['opportunity', 'auto-generated'] })
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
    action: 'city_add_pr',
    city: cityName,
    slug: siteSlug,
    score,
    hotel_count: hotelEntries.length
  });
  writeJSON(HISTORY_FILE, history);

  // Clean up generated site (it's just for verification)
  try {
    fs.rmSync(path.join(ROOT, 'sites', siteSlug), { recursive: true });
  } catch {}

  console.log(`\n✅  City add complete. Draft PR created for review.\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
