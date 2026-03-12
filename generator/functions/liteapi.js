/**
 * Netlify Serverless Function: LiteAPI Proxy
 *
 * Routes booking API calls server-side so the LiteAPI key is never
 * exposed in client HTML. The LITEAPI_KEY env var must be set in the
 * Netlify site settings (deploy-all.js sets it automatically).
 *
 * Accepts:  POST /.netlify/functions/liteapi?ep=hotels/rates
 *           POST /.netlify/functions/liteapi?ep=hotels/prebook
 *           POST /.netlify/functions/liteapi?ep=hotels/book
 *           POST /.netlify/functions/liteapi?ep=hotels/cancel
 *
 * The request body is forwarded as-is to LiteAPI v3.
 */

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';

// Allowlist — only forward requests to these endpoints
const ALLOWED_ENDPOINTS = new Set([
  'hotels/rates',
  'hotels/prebook',
  'hotels/book',
  'hotels/cancel',
  'data/hotel',   // hotel photos / details (GET)
]);

exports.handler = async function (event) {
  // ── CORS preflight ──────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  // ── Validate endpoint ───────────────────────────────────────
  const ep = (event.queryStringParameters?.ep || '').replace(/^\/+/, '');
  if (!ALLOWED_ENDPOINTS.has(ep)) {
    return json(400, { error: `Unknown endpoint: ${ep}` });
  }

  // ── API key ─────────────────────────────────────────────────
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey) {
    console.error('LITEAPI_KEY env var not set');
    return json(500, { error: 'API not configured' });
  }

  // ── Proxy to LiteAPI ────────────────────────────────────────
  const url = `${LITEAPI_BASE}/${ep}`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: event.body || '{}',
    });

    const body = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body,
    };
  } catch (err) {
    console.error('LiteAPI proxy error:', err.message);
    return json(502, { error: 'Upstream request failed', detail: err.message });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(obj),
  };
}
