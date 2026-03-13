/**
 * Cloudflare Worker: LuxStay — LiteAPI Proxy + Static Assets
 *
 * - Requests to /api/liteapi are proxied server-side to LiteAPI v3
 *   so the API key is never exposed in the browser.
 * - All other requests are served from static assets (sites/luxstay/).
 */

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';

const ALLOWED_ENDPOINTS = new Set([
  'hotels/rates',
  'rates/prebook',
  'rates/book',
  'hotels/cancel',
  'data/hotel',
]);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── LiteAPI proxy route ─────────────────────────────────────
    if (url.pathname === '/api/liteapi') {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
      }

      // Validate endpoint
      const ep = (url.searchParams.get('ep') || '').replace(/^\/+/, '');
      if (!ALLOWED_ENDPOINTS.has(ep)) {
        return jsonResponse(400, { error: `Unknown endpoint: ${ep}` });
      }

      // API key
      if (!env.LITEAPI_KEY) {
        return jsonResponse(500, { error: 'API not configured' });
      }

      // Proxy to LiteAPI
      const target = `${LITEAPI_BASE}/${ep}`;
      try {
        const body = await request.text();
        const upstream = await fetch(target, {
          method: 'POST',
          headers: {
            'X-API-Key': env.LITEAPI_KEY,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: body || '{}',
        });
        const responseBody = await upstream.text();
        return new Response(responseBody, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      } catch (err) {
        return jsonResponse(502, {
          error: 'Upstream request failed',
          detail: err.message,
        });
      }
    }

    // ── Everything else → static assets ─────────────────────────
    return env.ASSETS.fetch(request);
  },
};
