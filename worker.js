/**
 * Cloudflare Worker: LuxStay — LiteAPI Proxy + Member Signup + Static Assets
 *
 * - Requests to /api/liteapi are proxied server-side to LiteAPI v3
 *   so the API key is never exposed in the browser.
 * - POST /api/signup captures member email signups (stored in KV if bound,
 *   otherwise logged to Workers console for retrieval via wrangler tail).
 * - All other requests are served from static assets (sites/luxstay/).
 */

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';

// Endpoints that accept POST (write operations)
const POST_ENDPOINTS = new Set([
  'hotels/rates',
  'rates/prebook',
  'rates/book',
  'hotels/cancel',
]);

// Endpoints that accept GET (read-only lookups)
const GET_ENDPOINTS = new Set([
  'data/hotel',
]);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

      // Validate endpoint
      const ep = (url.searchParams.get('ep') || '').replace(/^\/+/, '');
      const isPost = POST_ENDPOINTS.has(ep);
      const isGet = GET_ENDPOINTS.has(ep);

      if (!isPost && !isGet) {
        return jsonResponse(400, { error: `Unknown endpoint: ${ep}` });
      }

      // Enforce correct HTTP method
      if (isPost && request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed — use POST' });
      }
      if (isGet && request.method !== 'GET' && request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed — use GET' });
      }

      // API key
      if (!env.LITEAPI_KEY) {
        return jsonResponse(500, { error: 'API not configured' });
      }

      try {
        let upstreamUrl, upstreamOpts;

        if (isGet && request.method === 'GET') {
          // Forward GET requests with query params (minus 'ep')
          const qs = new URLSearchParams(url.searchParams);
          qs.delete('ep');
          const queryStr = qs.toString();
          upstreamUrl = `${LITEAPI_BASE}/${ep}${queryStr ? '?' + queryStr : ''}`;
          upstreamOpts = {
            method: 'GET',
            headers: {
              'X-API-Key': env.LITEAPI_KEY,
              accept: 'application/json',
            },
          };
        } else {
          // POST requests — forward body as JSON
          upstreamUrl = `${LITEAPI_BASE}/${ep}`;
          const body = await request.text();
          upstreamOpts = {
            method: 'POST',
            headers: {
              'X-API-Key': env.LITEAPI_KEY,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            body: body || '{}',
          };
        }

        const upstream = await fetch(upstreamUrl, upstreamOpts);
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

    // ── Member signup route ───────────────────────────────────────
    if (url.pathname === '/api/signup') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }
      if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed — use POST' });
      }

      try {
        const body = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          return jsonResponse(400, { error: 'Valid email required' });
        }

        const record = {
          email,
          source: body.source || 'email',
          ts: new Date().toISOString(),
          ua: request.headers.get('user-agent') || '',
          ip: request.headers.get('cf-connecting-ip') || '',
          country: request.headers.get('cf-ipcountry') || '',
        };

        // Store in KV if SIGNUPS namespace is bound, otherwise log
        if (env.SIGNUPS) {
          const key = `signup:${Date.now()}:${email}`;
          await env.SIGNUPS.put(key, JSON.stringify(record), { expirationTtl: 86400 * 365 });
        }

        // Always log so wrangler tail captures it even without KV
        console.log('MEMBER_SIGNUP', JSON.stringify(record));

        return jsonResponse(200, { ok: true });
      } catch (err) {
        console.error('Signup error:', err.message);
        return jsonResponse(200, { ok: true }); // don't break UX on errors
      }
    }

    // ── Everything else → static assets ─────────────────────────
    return env.ASSETS.fetch(request);
  },
};
