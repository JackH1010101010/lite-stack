#!/usr/bin/env node
/**
 * autoresearch/weekly-digest.js
 *
 * Weekly metacognitive monitoring loop.
 * Reads PostHog event data for the past 7 days, calculates funnel conversion
 * rates across all sites, identifies drop-off points, and creates a GitHub
 * Issue with observations + suggested experiments.
 *
 * Also checks for SEO opportunities: which pages have traffic but low conversion.
 *
 * Runs weekly via GitHub Actions cron (Sunday 04:00 UTC — after the rebuild at 03:00).
 *
 * Required env vars:
 *   POSTHOG_PERSONAL_KEY  — PostHog personal API key (Settings → Personal API Keys)
 *   POSTHOG_PROJECT_ID    — PostHog project ID (from project URL)
 *   GH_TOKEN              — GitHub token (automatically set in Actions)
 *   GITHUB_REPOSITORY     — e.g. JackH1010101010/lite-stack (auto-set in Actions)
 *
 * Usage (local test):
 *   POSTHOG_PERSONAL_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 node autoresearch/weekly-digest.js
 */

const crypto        = require('crypto');
const POSTHOG_API   = 'https://us.posthog.com/api';
const PERSONAL_KEY  = process.env.POSTHOG_PERSONAL_KEY;
const PROJECT_ID    = process.env.POSTHOG_PROJECT_ID;
const GH_TOKEN      = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const GH_REPO       = process.env.GITHUB_REPOSITORY || 'JackH1010101010/lite-stack';

// ── GSC config ─────────────────────────────────────────────────
// GOOGLE_SERVICE_ACCOUNT_JSON — full JSON key file content as GitHub secret
// GSC_SITE_URLS — comma-separated list, e.g. "https://luxstay.netlify.app/,https://dubai-ultra.netlify.app/"
const GSC_SA        = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? (() => { try { return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); } catch { return null; } })()
  : null;
const GSC_SITES     = (process.env.GSC_SITE_URLS || '').split(',').map(s => s.trim()).filter(Boolean);

// Funnel steps in order
const FUNNEL = [
  { event: '$pageview',        label: 'Page views'       },
  { event: 'hotel_search',     label: 'Hotel searches'   },
  { event: 'booking_started',  label: 'Bookings started' },
  { event: 'booking_completed',label: 'Bookings completed'},
  { event: 'member_joined',    label: 'Members joined'   },
];

// ── PostHog helpers ────────────────────────────────────────────
async function phGet(path) {
  const res = await fetch(`${POSTHOG_API}${path}`, {
    headers: { Authorization: `Bearer ${PERSONAL_KEY}` },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`PostHog ${path} → ${res.status}`);
  return res.json();
}

async function getEventCount(eventName, dateFrom, dateTo) {
  const params = new URLSearchParams({
    event: eventName,
    date_from: dateFrom,
    date_to: dateTo,
    display: 'ActionsTable',
  });
  try {
    const data = await phGet(`/projects/${PROJECT_ID}/insights/trend/?${params}`);
    const result = data?.result?.[0];
    return result?.aggregated_value || result?.count || 0;
  } catch { return null; }
}

async function getTopPages(dateFrom, dateTo) {
  const params = new URLSearchParams({
    event: '$pageview',
    date_from: dateFrom,
    date_to: dateTo,
    display: 'ActionsTable',
    breakdown: '$current_url',
  });
  try {
    const data = await phGet(`/projects/${PROJECT_ID}/insights/trend/?${params}`);
    return (data?.result || [])
      .sort((a, b) => (b.aggregated_value || 0) - (a.aggregated_value || 0))
      .slice(0, 10)
      .map(r => ({ url: r.breakdown_value, views: r.aggregated_value || 0 }));
  } catch { return []; }
}

// ── GSC helpers (no npm deps — pure Node crypto + fetch) ──────
async function gscAccessToken() {
  if (!GSC_SA) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const pay = Buffer.from(JSON.stringify({
      iss: GSC_SA.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    })).toString('base64url');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${hdr}.${pay}`);
    const jwt = `${hdr}.${pay}.${sign.sign(GSC_SA.private_key, 'base64url')}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    return (await res.json()).access_token || null;
  } catch (e) { console.warn('GSC token error:', e.message); return null; }
}

async function getGscData(dateFrom, dateTo) {
  if (!GSC_SA || !GSC_SITES.length) return null;
  try {
    const token = await gscAccessToken();
    if (!token) return null;
    const results = [];
    for (const site of GSC_SITES) {
      const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
      // Top pages by clicks
      const [pageRes, queryRes] = await Promise.all([
        fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: dateFrom, endDate: dateTo, dimensions: ['page'], rowLimit: 10 }) }),
        fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: dateFrom, endDate: dateTo, dimensions: ['query'], rowLimit: 10 }) }),
      ]);
      const pages   = pageRes.ok  ? (await pageRes.json()).rows  || [] : [];
      const queries = queryRes.ok ? (await queryRes.json()).rows || [] : [];
      results.push({ site, pages, queries });
    }
    return results;
  } catch (e) { console.warn('GSC fetch error:', e.message); return null; }
}

// ── GitHub helpers ─────────────────────────────────────────────
async function createGitHubIssue(title, body) {
  if (!GH_TOKEN) { console.log('No GH_TOKEN — printing report only'); return null; }
  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels: ['weekly-digest', 'analytics'] })
  });
  if (!res.ok) { console.warn('Could not create GitHub issue:', res.status); return null; }
  const issue = await res.json();
  return issue.html_url;
}

async function closeOldDigestIssues() {
  if (!GH_TOKEN) return;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GH_REPO}/issues?labels=weekly-digest&state=open&per_page=10`,
      { headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    const issues = await res.json();
    for (const issue of (issues || [])) {
      await fetch(`https://api.github.com/repos/${GH_REPO}/issues/${issue.number}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'closed' })
      });
    }
  } catch { /* non-fatal */ }
}

// ── Observations engine ────────────────────────────────────────
function generateObservations(funnel, topPages) {
  const obs = [];
  const sugg = [];

  const [views, searches, bkStarted, bkCompleted, members] = funnel;

  // Traffic level
  if (views === null) {
    obs.push('⚠️ PostHog data unavailable — check POSTHOG_PERSONAL_KEY and POSTHOG_PROJECT_ID');
    return { observations: obs, suggestions: sugg };
  }

  if (views === 0) {
    obs.push('🚨 Zero page views this week — site may be down or PostHog snippet missing');
    sugg.push('Run health-check workflow manually to verify all sites are live');
    return { observations: obs, suggestions: sugg };
  }

  // Search rate
  const searchRate = views > 0 ? (searches / views * 100).toFixed(1) : 0;
  if (searchRate < 20) {
    obs.push(`🔍 Search rate is low: only ${searchRate}% of visitors searched for hotels`);
    sugg.push('Test moving the search bar higher on the page or adding a more prominent CTA');
    sugg.push('Check whether mobile users can see the search bar without scrolling');
  } else {
    obs.push(`✅ Search rate healthy: ${searchRate}% of visitors searched (${searches} searches)`);
  }

  // Booking start rate (searches → booking started)
  if (searches > 0) {
    const bkStartRate = (bkStarted / searches * 100).toFixed(1);
    if (bkStartRate < 10) {
      obs.push(`💰 Low booking intent: only ${bkStartRate}% of searchers started a booking`);
      sugg.push('Check if live rates are loading — API errors here kill conversion');
      sugg.push('Consider a "No availability?" fallback message with alternative dates');
      sugg.push('Improve the member-rate saving badge visibility on hotel cards');
    } else {
      obs.push(`✅ Booking intent rate: ${bkStartRate}% of searchers clicked Book`);
    }
  }

  // Booking completion rate (started → completed)
  if (bkStarted > 0) {
    const completionRate = (bkCompleted / bkStarted * 100).toFixed(1);
    if (completionRate < 40) {
      obs.push(`🛑 High booking drop-off: only ${completionRate}% of started bookings completed`);
      sugg.push('Investigate LiteAPI payment SDK load failures — check browser console errors');
      sugg.push('Add a "Save booking details" option so users can return without restarting');
      sugg.push('Review whether the prebook step is timing out (15-min window)');
    } else {
      obs.push(`✅ Booking completion: ${completionRate}% of started bookings were completed`);
    }
  } else if (searches > 5) {
    obs.push('⚠️ No bookings started this week despite search activity');
    sugg.push('Verify LiteAPI rates are returning for current dates — try a live search');
  }

  // Member conversion
  if (views > 0) {
    const memberRate = (members / views * 100).toFixed(2);
    obs.push(`👥 Member conversion: ${memberRate}% of all visitors joined (${members} new members)`);
    if (memberRate < 0.5 && views > 50) {
      sugg.push('Test moving the membership modal trigger earlier (after first search, not after 30s)');
      sugg.push('A/B test the modal headline — run evolve.js --generate to create copy variants');
    }
  }

  // Top pages insight
  if (topPages.length > 0) {
    const seoPagesWithTraffic = topPages.filter(p =>
      p.url && (p.url.includes('.html') || p.url.includes('heathrow') || p.url.includes('maldives'))
    );
    if (seoPagesWithTraffic.length > 0) {
      obs.push(`📄 SEO pages getting traffic: ${seoPagesWithTraffic.slice(0,3).map(p => p.url.split('/').pop()).join(', ')}`);
    } else {
      obs.push('📄 SEO city/region pages not yet showing in top traffic sources — may need time to index');
      sugg.push('Submit sitemap.xml to Google Search Console for all three sites');
      sugg.push('Build 2-3 backlinks to each site from relevant directories or travel blogs');
    }
  }

  return { observations: obs, suggestions: sugg };
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const today    = new Date();
  const lastWeek = new Date(today - 7 * 86400000);
  const fmt      = d => d.toISOString().slice(0, 10);
  const dateFrom = fmt(lastWeek);
  const dateTo   = fmt(today);

  console.error(`\n📊  Weekly digest — ${dateFrom} to ${dateTo}\n`);

  if (!PERSONAL_KEY || !PROJECT_ID) {
    console.error('⚠️  POSTHOG_PERSONAL_KEY or POSTHOG_PROJECT_ID not set');
    console.error('   Get personal key: PostHog → Settings → Personal API Keys');
    console.error('   Get project ID: PostHog → Project Settings → Project ID\n');
  }

  // Fetch all funnel metrics + GSC in parallel
  const [funnelCounts, topPages, gscData] = await Promise.all([
    Promise.all(FUNNEL.map(f => getEventCount(f.event, dateFrom, dateTo))),
    getTopPages(dateFrom, dateTo),
    getGscData(dateFrom, dateTo),
  ]);

  // Build funnel table
  const funnelRows = FUNNEL.map((f, i) => {
    const count = funnelCounts[i];
    const prev  = i > 0 ? funnelCounts[i - 1] : null;
    const rate  = prev && prev > 0 ? ` (${(count / prev * 100).toFixed(1)}% of prev)` : '';
    return `| ${f.label.padEnd(22)} | ${String(count ?? '–').padStart(8)} |${rate} |`;
  }).join('\n');

  const { observations, suggestions } = generateObservations(funnelCounts, topPages);

  const topPagesTable = topPages.length
    ? topPages.slice(0, 8).map(p => `| ${(p.url || '').slice(-60).padEnd(62)} | ${String(p.views).padStart(6)} |`).join('\n')
    : '| (no data) | – |';

  // Build GSC section
  let gscSection = '';
  if (gscData && gscData.length) {
    const gscLines = gscData.map(({ site, pages, queries }) => {
      const pageRows = pages.slice(0, 8).map(r =>
        `| ${(r.keys[0] || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 50).padEnd(52)} | ${String(Math.round(r.clicks)).padStart(6)} | ${String(Math.round(r.impressions)).padStart(11)} | ${(r.position || 0).toFixed(1).padStart(8)} |`
      ).join('\n');
      const queryRows = queries.slice(0, 8).map(r =>
        `| ${(r.keys[0] || '').slice(0, 40).padEnd(42)} | ${String(Math.round(r.clicks)).padStart(6)} | ${(r.position || 0).toFixed(1).padStart(8)} |`
      ).join('\n');
      const siteName = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `#### ${siteName}\n\n**Top pages**\n\n| Page | Clicks | Impressions | Avg Pos |\n|------|--------|-------------|----------|\n${pageRows || '| (no data) | – | – | – |'}\n\n**Top queries**\n\n| Query | Clicks | Avg Pos |\n|-------|--------|----------|\n${queryRows || '| (no data) | – | – |'}`;
    }).join('\n\n');
    gscSection = `\n\n### Google Search Console\n\n${gscLines}`;
  } else if (GSC_SA) {
    gscSection = '\n\n### Google Search Console\n\n_No GSC data returned — check site URL format and service account permissions._';
  } else {
    gscSection = '\n\n### Google Search Console\n\n_Not configured — add `GOOGLE_SERVICE_ACCOUNT_JSON` and `GSC_SITE_URLS` secrets to enable._';
  }

  const issueBody = `## Lite-Stack Weekly Digest — ${dateFrom} to ${dateTo}

### Conversion Funnel

| Step                   |    Count |
|------------------------|----------|
${funnelRows}

### Top Pages by Traffic

| URL                                                            | Views  |
|----------------------------------------------------------------|--------|
${topPagesTable}

### Observations

${observations.map(o => `- ${o}`).join('\n')}

### Suggested Experiments

${suggestions.length ? suggestions.map(s => `- [ ] ${s}`).join('\n') : '- ✅ No urgent suggestions this week'}

${gscSection}

---
_Generated by autoresearch/weekly-digest.js · ${new Date().toISOString()}_
_Close this issue once reviewed — it will be replaced next Sunday_`;

  // Print to console
  console.log(issueBody);

  // Create GitHub Issue
  if (PERSONAL_KEY && PROJECT_ID) {
    await closeOldDigestIssues();
    const url = await createGitHubIssue(
      `📊 Weekly digest — ${dateFrom} to ${dateTo}`,
      issueBody
    );
    if (url) console.error(`\n✅  Issue created: ${url}\n`);
  } else {
    console.error('\n(Skipping GitHub issue — PostHog keys not set)\n');
  }
}

main().catch(e => { console.error('❌ Digest failed:', e.message); process.exit(1); });
