/**
 * Cloudflare Pages Function: LiteAPI Proxy
 *
 * Routes booking API calls server-side so the LiteAPI key is never
 * exposed in client HTML. The LITEAPI_KEY env var must be set in the
 * Cloudflare Pages project settings.
 *
 * Accepts:  POST /api/liteapi?ep=hotels/rates
 *           POST /api/liteapi?ep=rates/prebook
 *           POST /api/liteapi?ep=rates/book
 *           POST /api/liteapi?ep=hotels/cancel
 *           POST /api/liteapi?ep=data/hotel  (GET forwarded as POST)
 *
 * The request body is forwarded as-is to LiteAPI v3.
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

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Validate endpoint
  const url = new URL(request.url);
  const ep = (url.searchParams.get('ep') || '').replace(/^\/+/, '');
  if (!ALLOWED_ENDPOINTS.has(ep)) {
    return jsonResponse(400, { error: `Unknown endpoint: ${ep}` });
  }

  // API key from environment
  const apiKey = env.LITEAPI_KEY;
  if (!apiKey) {
    console.error('LITEAPI_KEY env var not set');
    return jsonResponse(500, { error: 'API not configured' });
  }

  // Proxy to LiteAPI
  const target = `${LITEAPI_BASE}/${ep}`;
  try {
    const body = await request.text();
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: body || '{}',
    });

    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (err) {
    console.error('LiteAPI proxy error:', err.message);
    return jsonResponse(502, { error: 'Upstream request failed', detail: err.message });
  }
}
