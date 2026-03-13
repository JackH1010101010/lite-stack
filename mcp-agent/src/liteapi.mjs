/**
 * LiteAPI HTTP client — wraps the v3.0 REST API.
 * Zero dependencies (uses built-in fetch).
 *
 * Base URL: https://api.liteapi.travel/v3.0
 * Auth:     X-API-Key header
 */

const BASE = "https://api.liteapi.travel/v3.0";

async function request(apiKey, method, path, params, body) {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    : "";

  const url = `${BASE}/${path}${qs}`;

  const res = await fetch(url, {
    method,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    ...(method === "POST" && body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LiteAPI ${res.status}: ${text.slice(0, 500)}`);
  }
}

// ── Data endpoints ──────────────────────────────────────────────

export async function getHotels(apiKey, { countryCode, cityName, starRating, limit, offset }) {
  const params = { countryCode, cityName };
  if (starRating) params.starRating = String(starRating);
  if (limit) params.limit = String(limit);
  if (offset) params.offset = String(offset);
  return request(apiKey, "GET", "data/hotels", params);
}

export async function getHotelDetails(apiKey, { hotelId }) {
  return request(apiKey, "GET", "data/hotel", { hotelId });
}

// ── Search / Rates ──────────────────────────────────────────────

export async function getRates(apiKey, { hotelIds, checkin, checkout, adults, children, childrenAges, currency, guestNationality }) {
  return request(apiKey, "POST", "hotels/rates", undefined, {
    hotelIds,
    checkin,
    checkout,
    occupancies: [
      {
        adults,
        ...(children ? { children } : {}),
        ...(childrenAges ? { childrenAges } : {}),
      },
    ],
    currency: currency || "GBP",
    guestNationality: guestNationality || "GB",
  });
}

// ── Booking ─────────────────────────────────────────────────────

export async function preBook(apiKey, { offerId, usePaymentSdk }) {
  return request(apiKey, "POST", "rates/prebook", undefined, {
    offerId,
    usePaymentSdk: usePaymentSdk ?? false,
  });
}

export async function book(apiKey, { prebookId, guestInfo, payment }) {
  return request(apiKey, "POST", "rates/book", undefined, {
    prebookId,
    guestInfo,
    ...(payment ? { payment } : {}),
  });
}
