#!/usr/bin/env node

/**
 * Lite-Stack MCP Agent — AI Hotel Booking with CUG Wholesale Rates
 *
 * An MCP server that gives AI assistants the ability to search, compare,
 * and book luxury hotels using LiteAPI wholesale rates.
 *
 * Tools:
 *   1. search_hotels      — Find hotels by city/country with quality scores
 *   2. get_hotel_details   — Full hotel info + Lite-Stack quality score
 *   3. get_rates           — Live rates with CUG framing (savings vs OTA)
 *   4. pre_book            — Lock in a rate, confirm availability
 *   5. complete_booking    — Finalise a reservation
 *
 * Zero external dependencies — uses Node.js built-in fetch + readline.
 * Runs over stdio using JSON-RPC 2.0 (MCP transport).
 */

import { McpStdioServer } from "./mcp-stdio.mjs";
import * as liteapi from "./liteapi.mjs";
import { computeQualityScore } from "./quality-score.mjs";
import { frameAllRates } from "./cug-framing.mjs";
import {
  initPostHog,
  trackSearch,
  trackHotelViewed,
  trackBookingStarted,
  trackBookingCompleted,
  getSessionId,
} from "./tracking.mjs";

// ── Configuration ───────────────────────────────────────────────

const API_KEY =
  process.env.LITEAPI_API_KEY ||
  process.env.LITEAPI_PROD_KEY ||
  process.env.LITEAPI_SANDBOX_KEY ||
  process.env.LITEAPI_SANDBOX_PUBLIC_KEY ||
  "";

const POSTHOG_KEY = process.env.POSTHOG_PROJECT_KEY || "";

// ── Server setup ────────────────────────────────────────────────

const server = new McpStdioServer("lite-stack-hotels", "1.0.0");

// ── Tool 1: search_hotels ───────────────────────────────────────

server.tool(
  "search_hotels",
  "Search for luxury hotels in a city. Returns hotel IDs, names, star ratings, and Lite-Stack quality scores. Use the hotel IDs with get_rates to check availability and member pricing.",
  {
    country_code: {
      type: "string",
      description: 'ISO 3166-1 alpha-2 country code, e.g. "AE" for UAE, "MV" for Maldives, "GB" for UK',
    },
    city_name: {
      type: "string",
      description: 'City name, e.g. "Dubai", "Male", "London"',
    },
    min_star_rating: {
      type: "number",
      description: "Minimum star rating (1-5). Optional.",
      optional: true,
    },
    limit: {
      type: "number",
      description: "Maximum number of results (1-50). Default: 20.",
      optional: true,
    },
  },
  async ({ country_code, city_name, min_star_rating, limit }) => {
    trackSearch({
      country_code,
      city_name,
      destination: `${city_name}, ${country_code}`,
      filters: { min_star_rating, limit },
    });

    try {
      const result = await liteapi.getHotels(API_KEY, {
        countryCode: country_code,
        cityName: city_name,
        starRating: min_star_rating,
        limit: limit || 20,
      });

      const hotels = Array.isArray(result?.data) ? result.data : [];
      const enriched = hotels.map((h) => ({
        ...h,
        ...computeQualityScore({
          starRating: h.starRating || h.star_rating,
          reviewScore: h.reviewScore || h.rating,
          reviewCount: h.reviewCount || h.reviews,
          amenities: h.amenities || h.facilities || [],
        }),
      }));

      // Sort by quality score descending
      enriched.sort((a, b) => b.lite_stack_quality_score - a.lite_stack_quality_score);

      const summary =
        enriched.length > 0
          ? `Found ${enriched.length} hotels in ${city_name}, ${country_code}.\n\n` +
            `Top rated:\n` +
            enriched
              .slice(0, 5)
              .map(
                (h, i) =>
                  `${i + 1}. ${h.name || h.hotelId} — ${h.starRating || "?"}★ — Quality: ${h.lite_stack_quality_score}/10 (${h.quality_label})`
              )
              .join("\n") +
            `\n\nUse get_rates with the hotel IDs to check live pricing and member rate savings.`
          : `No hotels found in ${city_name}, ${country_code}. Try a different city or remove star rating filter.`;

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify({ hotels: enriched, total: enriched.length }, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error searching hotels: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: get_hotel_details ───────────────────────────────────

server.tool(
  "get_hotel_details",
  "Get full details for a specific hotel: description, amenities, images, location, and Lite-Stack proprietary quality score. Use a hotel ID from search_hotels.",
  {
    hotel_id: {
      type: "string",
      description: "The hotel ID from search_hotels results",
    },
  },
  async ({ hotel_id }) => {
    trackHotelViewed({ hotel_id });

    try {
      const result = await liteapi.getHotelDetails(API_KEY, { hotelId: hotel_id });
      const hotel = result?.data || result;

      const quality = computeQualityScore({
        starRating: hotel.starRating || hotel.star_rating,
        reviewScore: hotel.reviewScore || hotel.rating,
        reviewCount: hotel.reviewCount || hotel.reviews,
        amenities: hotel.amenities || hotel.facilities || [],
      });

      const enriched = { ...hotel, ...quality };

      const name = hotel.name || hotel_id;
      const stars = hotel.starRating || hotel.star_rating || "N/A";
      const summary = [
        `**${name}** — ${stars}★`,
        `Lite-Stack Quality Score: ${quality.lite_stack_quality_score}/10 (${quality.quality_label})`,
        hotel.address ? `Address: ${hotel.address}` : "",
        hotel.city ? `City: ${hotel.city}` : "",
        hotel.description ? `\n${String(hotel.description).slice(0, 400)}...` : "",
        hotel.amenities?.length ? `\nKey amenities: ${hotel.amenities.slice(0, 12).join(", ")}` : "",
        hotel.images?.length ? `\n${hotel.images.length} photos available` : "",
        `\nUse get_rates with hotel ID "${hotel_id}" to see exclusive member pricing.`,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(enriched, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error fetching hotel details: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 3: get_rates ───────────────────────────────────────────

server.tool(
  "get_rates",
  "Get live room rates for hotels with exclusive CUG member pricing. Shows savings vs typical OTA prices (usually 15-25% less). Returns offer IDs needed for booking.",
  {
    hotel_ids: {
      type: "array",
      items: { type: "string" },
      description: "Array of hotel IDs to get rates for (max 10)",
    },
    checkin: {
      type: "string",
      description: "Check-in date in YYYY-MM-DD format",
    },
    checkout: {
      type: "string",
      description: "Check-out date in YYYY-MM-DD format",
    },
    adults: {
      type: "number",
      description: "Number of adults (1-6). Default: 2",
      optional: true,
    },
    currency: {
      type: "string",
      description: '3-letter currency code. Default: "GBP"',
      optional: true,
    },
    guest_nationality: {
      type: "string",
      description: 'Guest nationality ISO 2-letter code. Default: "GB"',
      optional: true,
    },
  },
  async ({ hotel_ids, checkin, checkout, adults, currency, guest_nationality }) => {
    const cur = currency || "GBP";
    const numAdults = adults || 2;

    try {
      const result = await liteapi.getRates(API_KEY, {
        hotelIds: hotel_ids,
        checkin,
        checkout,
        adults: numAdults,
        currency: cur,
        guestNationality: guest_nationality || "GB",
      });

      const framed = frameAllRates(result, cur);
      const hotels = Array.isArray(framed?.data) ? framed.data : [];

      let summary;
      if (hotels.length === 0) {
        summary = `No available rates found for ${checkin} → ${checkout}. Try different dates or hotels.`;
      } else {
        const lines = hotels.map((h) => {
          const name = h.hotelName || h.name || h.hotelId;
          const rooms = h.roomTypes || h.rates || [];
          if (rooms.length === 0) return `• ${name}: No rooms available`;

          // Find cheapest rate
          let cheapestRate = Infinity;
          let cheapestFraming = "";
          let cheapestSavings = 0;

          for (const room of rooms) {
            const rates = room.rates || [room];
            for (const r of rates) {
              const price = r.cug_rate || 0;
              if (price > 0 && price < cheapestRate) {
                cheapestRate = price;
                cheapestFraming = r.framing_text || "";
                cheapestSavings = r.savings_percentage || 0;
              }
            }
          }

          if (cheapestRate === Infinity) return `• ${name}: Rates available (see details)`;

          return `• ${name}: ${cheapestFraming}${cheapestSavings ? ` — save ${cheapestSavings}% vs OTA` : ""}`;
        });

        summary = [
          `**Member Rates for ${checkin} → ${checkout}** (${numAdults} adult${numAdults > 1 ? "s" : ""})`,
          "",
          "All rates are exclusive member prices, typically 15-25% below OTA pricing.",
          "",
          ...lines,
          "",
          "Use the offerId from the data below with pre_book to lock in a rate.",
        ].join("\n");
      }

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(framed, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error fetching rates: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 4: pre_book ────────────────────────────────────────────

server.tool(
  "pre_book",
  "Lock in a hotel rate and confirm it's still available. Returns a prebookId needed to complete the booking. Always pre-book before completing a booking.",
  {
    offer_id: {
      type: "string",
      description: "The offerId from get_rates results",
    },
  },
  async ({ offer_id }) => {
    trackBookingStarted({ offer_id });

    try {
      const result = await liteapi.preBook(API_KEY, {
        offerId: offer_id,
        usePaymentSdk: false,
      });

      const data = result?.data || result;
      const prebookId = data?.prebookId;

      if (!prebookId) {
        return {
          content: [
            {
              type: "text",
              text: `Pre-booking failed. The rate may no longer be available. Try get_rates again.\n\nResponse: ${JSON.stringify(result, null, 2)}`,
            },
          ],
          isError: true,
        };
      }

      let summary = `Rate locked! Prebook ID: ${prebookId}`;
      if (data?.isPriceChanged) {
        summary += `\n⚠️ Price has changed since search. New rate: ${JSON.stringify(data.newRate)}`;
      }
      summary += `\n\nUse complete_booking with this prebookId, plus guest name and email, to finalise.`;

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error during pre-booking: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 5: complete_booking ────────────────────────────────────

server.tool(
  "complete_booking",
  "Complete a hotel reservation. Requires the prebookId from pre_book and guest details. Returns booking confirmation with booking ID and hotel confirmation code.",
  {
    prebook_id: {
      type: "string",
      description: "The prebookId from pre_book results",
    },
    first_name: {
      type: "string",
      description: "Guest first name",
    },
    last_name: {
      type: "string",
      description: "Guest last name",
    },
    email: {
      type: "string",
      description: "Guest email address for confirmation",
    },
  },
  async ({ prebook_id, first_name, last_name, email }) => {
    try {
      const result = await liteapi.book(API_KEY, {
        prebookId: prebook_id,
        guestInfo: { firstName: first_name, lastName: last_name, email },
      });

      const data = result?.data || result;
      const bookingId = data?.bookingId;

      trackBookingCompleted({
        booking_id: bookingId,
        total: data?.totalRate || data?.total,
        currency: data?.currency,
      });

      if (!bookingId) {
        return {
          content: [
            {
              type: "text",
              text: `Booking could not be completed. ${JSON.stringify(result, null, 2)}`,
            },
          ],
          isError: true,
        };
      }

      const summary = [
        `Booking confirmed!`,
        `Booking ID: ${bookingId}`,
        data?.hotelConfirmationCode ? `Hotel confirmation: ${data.hotelConfirmationCode}` : "",
        data?.hotelName ? `Hotel: ${data.hotelName}` : "",
        data?.checkin ? `Check-in: ${data.checkin}` : "",
        data?.checkout ? `Check-out: ${data.checkout}` : "",
        ``,
        `A confirmation email will be sent to ${email}.`,
      ]
        .filter((l) => l !== undefined)
        .join("\n");

      return {
        content: [
          { type: "text", text: summary },
          { type: "text", text: JSON.stringify(data, null, 2) },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error completing booking: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Start ───────────────────────────────────────────────────────

if (!API_KEY) {
  console.error(
    "[lite-stack-mcp] ERROR: No LiteAPI key found. Set LITEAPI_API_KEY, LITEAPI_PROD_KEY, or LITEAPI_SANDBOX_KEY."
  );
  process.exit(1);
}

initPostHog(POSTHOG_KEY);

console.error(`[lite-stack-mcp] Starting — session ${getSessionId()}`);
console.error(`[lite-stack-mcp] API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
console.error(`[lite-stack-mcp] PostHog: ${POSTHOG_KEY ? "enabled" : "disabled"}`);

server.serve();
