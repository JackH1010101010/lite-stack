#!/usr/bin/env node
/**
 * reconcile.js — Booking Reconciliation
 *
 * Compares LiteAPI confirmed bookings against PostHog booking_completed events
 * for the past N days. Flags:
 *   - Bookings in PostHog not found in LiteAPI (possibly duplicate / ghost events)
 *   - Bookings in LiteAPI not found in PostHog (revenue not tracked)
 *   - Revenue discrepancies > £5 between PostHog amount and LiteAPI totalPayable
 *
 * Creates a GitHub Issue if anomalies are found.
 *
 * Required env vars:
 *   LITEAPI_KEY              — LiteAPI production key
 *   POSTHOG_PERSONAL_KEY     — PostHog personal API key
 *   POSTHOG_PROJECT_ID       — PostHog project numeric ID
 *   GITHUB_TOKEN             — GitHub PAT with repo:write
 *   GITHUB_REPO              — e.g. "jackhughes/lite-stack"
 *
 * Usage: node autoresearch/reconcile.js [--days=30]
 */

const DAYS_BACK = parseInt((process.argv.find(a => a.startsWith('--days=')) || '--days=30').split('=')[1]);

const LITEAPI_KEY          = process.env.LITEAPI_KEY;
const POSTHOG_PERSONAL_KEY = process.env.POSTHOG_PERSONAL_KEY;
const POSTHOG_PROJECT_ID   = process.env.POSTHOG_PROJECT_ID;
const GITHUB_TOKEN         = process.env.GITHUB_TOKEN;
const GITHUB_REPO          = process.env.GITHUB_REPO;

// ── Date helpers ───────────────────────────────────────────────
function isoDate(d) { return d.toISOString().slice(0, 10); }

const now     = new Date();
const fromDt  = new Date(now.getTime() - DAYS_BACK * 86400000);
const fromStr = isoDate(fromDt);
const toStr   = isoDate(now);

// ── Fetch LiteAPI bookings ─────────────────────────────────────
async function getLiteApiBookings() {
  if (!LITEAPI_KEY) {
    console.warn('⚠  LITEAPI_KEY not set — skipping LiteAPI reconciliation');
    return [];
  }
  try {
    const url = `https://api.liteapi.travel/v3.0/bookings?from=${fromStr}&to=${toStr}&limit=200`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': LITEAPI_KEY, 'accept': 'application/json' }
    });
    if (!res.ok) {
      console.warn(`⚠  LiteAPI bookings endpoint returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    // LiteAPI v3 wraps results in data array
    const bookings = data?.data || data?.bookings || [];
    console.log(`📋  LiteAPI: found ${bookings.length} booking(s) in last ${DAYS_BACK} days`);
    return bookings;
  } catch (e) {
    console.warn(`⚠  LiteAPI fetch error: ${e.message}`);
    return [];
  }
}

// ── Fetch PostHog booking_completed events ─────────────────────
async function getPostHogBookings() {
  if (!POSTHOG_PERSONAL_KEY || !POSTHOG_PROJECT_ID) {
    console.warn('⚠  POSTHOG_PERSONAL_KEY or POSTHOG_PROJECT_ID not set');
    return [];
  }
  try {
    const after  = fromDt.toISOString();
    const before = now.toISOString();
    const params = new URLSearchParams({
      event:  'booking_completed',
      after,
      before,
      limit:  '200',
    });
    const url = `https://app.posthog.com/api/projects/${POSTHOG_PROJECT_ID}/events/?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${POSTHOG_PERSONAL_KEY}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      console.warn(`⚠  PostHog events API returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const events = data?.results || [];
    console.log(`📊  PostHog: found ${events.length} booking_completed event(s) in last ${DAYS_BACK} days`);
    return events;
  } catch (e) {
    console.warn(`⚠  PostHog fetch error: ${e.message}`);
    return [];
  }
}

// ── Reconcile ──────────────────────────────────────────────────
function reconcile(liteBookings, phEvents) {
  const anomalies = [];

  // Build lookup maps
  // LiteAPI: keyed by bookingId
  const liteById = {};
  for (const b of liteBookings) {
    const id = b.bookingId || b.id;
    if (id) liteById[id] = b;
  }

  // PostHog: keyed by booking_ref property
  const phByRef = {};
  for (const ev of phEvents) {
    const ref = ev.properties?.booking_ref;
    if (ref) phByRef[ref] = ev;
  }

  // 1. PostHog events with no matching LiteAPI booking
  for (const [ref, ev] of Object.entries(phByRef)) {
    if (!liteById[ref]) {
      anomalies.push({
        type: 'POSTHOG_NO_LITEAPI',
        ref,
        revenue: ev.properties?.revenue,
        currency: ev.properties?.currency || 'GBP',
        hotel: ev.properties?.hotel_name,
        timestamp: ev.timestamp,
        message: `PostHog records booking_completed for ref ${ref} but LiteAPI has no matching booking.`
      });
    }
  }

  // 2. LiteAPI bookings with no matching PostHog event
  for (const [id, b] of Object.entries(liteById)) {
    if (!phByRef[id]) {
      const status = b.status || b.bookingStatus || 'unknown';
      // Only flag confirmed/completed bookings — skip cancelled
      if (['CANCELLED', 'FAILED', 'cancelled', 'failed'].includes(status)) continue;
      anomalies.push({
        type: 'LITEAPI_NO_POSTHOG',
        ref: id,
        revenue: b.totalPayable?.amount,
        currency: b.totalPayable?.currency || 'GBP',
        hotel: b.hotel?.name,
        status,
        message: `LiteAPI has a confirmed booking ${id} (status: ${status}) with no PostHog tracking event.`
      });
    }
  }

  // 3. Revenue discrepancies > £5 for matched bookings
  for (const [ref, ev] of Object.entries(phByRef)) {
    const liteB = liteById[ref];
    if (!liteB) continue; // covered above
    const phRevenue   = parseFloat(ev.properties?.revenue || 0);
    const liteRevenue = parseFloat(liteB.totalPayable?.amount || 0);
    if (phRevenue > 0 && liteRevenue > 0) {
      const diff = Math.abs(phRevenue - liteRevenue);
      if (diff > 5) {
        anomalies.push({
          type: 'REVENUE_DISCREPANCY',
          ref,
          phRevenue,
          liteRevenue,
          diff: diff.toFixed(2),
          hotel: ev.properties?.hotel_name,
          message: `Revenue discrepancy for ${ref}: PostHog £${phRevenue} vs LiteAPI £${liteRevenue} (diff £${diff.toFixed(2)}).`
        });
      }
    }
  }

  return anomalies;
}

// ── Summary stats ──────────────────────────────────────────────
function buildSummary(liteBookings, phEvents, anomalies) {
  const liteRevenue = liteBookings
    .filter(b => !['CANCELLED','FAILED','cancelled','failed'].includes(b.status || b.bookingStatus))
    .reduce((s, b) => s + parseFloat(b.totalPayable?.amount || 0), 0);

  const phRevenue = phEvents
    .reduce((s, ev) => s + parseFloat(ev.properties?.revenue || 0), 0);

  return {
    period: `${fromStr} → ${toStr}`,
    liteApiBookings: liteBookings.length,
    postHogEvents: phEvents.length,
    liteApiRevenue: liteRevenue.toFixed(2),
    postHogRevenue: phRevenue.toFixed(2),
    anomalyCount: anomalies.length,
    anomalies,
  };
}

// ── GitHub Issue ───────────────────────────────────────────────
async function createGitHubIssue(summary) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.warn('⚠  GITHUB_TOKEN or GITHUB_REPO not set — skipping issue creation');
    return;
  }

  const title = `[Reconcile] ${summary.anomalyCount} booking anomal${summary.anomalyCount === 1 ? 'y' : 'ies'} detected (${toStr})`;

  const anomalyLines = summary.anomalies.map((a, i) =>
    `**${i + 1}. ${a.type}** — ${a.message}`
  ).join('\n\n');

  const body = `## Booking Reconciliation Report
**Period:** ${summary.period}

| Source | Bookings | Revenue |
|--------|----------|---------|
| LiteAPI | ${summary.liteApiBookings} | £${summary.liteApiRevenue} |
| PostHog | ${summary.postHogEvents} | £${summary.postHogRevenue} |

## Anomalies (${summary.anomalyCount})

${anomalyLines || '_No anomaly details available._'}

---
_Generated by \`autoresearch/reconcile.js\`_`;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'LiteStack-Reconcile/1.0',
    },
    body: JSON.stringify({
      title,
      body,
      labels: ['reconciliation', 'automated'],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`⚠  GitHub issue creation failed (${res.status}): ${text}`);
    return;
  }

  const issue = await res.json();
  console.log(`🐛  GitHub issue created: ${issue.html_url}`);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍  Reconciling bookings — last ${DAYS_BACK} days (${fromStr} → ${toStr})\n`);

  const [liteBookings, phEvents] = await Promise.all([
    getLiteApiBookings(),
    getPostHogBookings(),
  ]);

  const anomalies = reconcile(liteBookings, phEvents);
  const summary   = buildSummary(liteBookings, phEvents, anomalies);

  console.log(`\n── Summary ────────────────────────────────`);
  console.log(`  LiteAPI confirmed bookings : ${summary.liteApiBookings} (£${summary.liteApiRevenue})`);
  console.log(`  PostHog booking events     : ${summary.postHogEvents} (£${summary.postHogRevenue})`);
  console.log(`  Anomalies found            : ${summary.anomalyCount}`);

  if (anomalies.length > 0) {
    console.log('\n── Anomalies ──────────────────────────────');
    for (const a of anomalies) {
      console.log(`  ⚠  [${a.type}] ${a.message}`);
    }
    await createGitHubIssue(summary);
  } else {
    console.log('\n  ✅  Clean — no discrepancies found.');
  }

  console.log();

  // Exit non-zero only if anomalies found (useful for CI)
  process.exit(anomalies.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌  Reconcile failed:', err.message);
  process.exit(2);
});
