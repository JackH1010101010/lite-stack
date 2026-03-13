/**
 * CUG Rate Framing
 *
 * Enhances LiteAPI rate responses with CUG (Closed User Group) framing.
 * Wholesale rates presented as "exclusive member rates" with savings vs OTA.
 *
 * From AUTONOMOUS-LOOP-PLAN.md Workflow 9, steps 7-9.
 */

const LITE_STACK_MARKUP = 0.15;      // 15% markup on wholesale
const OTA_PREMIUM_ESTIMATE = 0.30;   // If no SSP, assume OTAs ~30% above wholesale

const CURRENCY_SYMBOLS = {
  GBP: "£", USD: "$", EUR: "€", AED: "AED ", JPY: "¥",
  CHF: "CHF ", AUD: "A$", CAD: "C$", SGD: "S$", INR: "₹",
};

function sym(currency) {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] || `${currency} `;
}

// ── Extract price from various LiteAPI rate shapes ──────────────

function extractPrice(rate) {
  if (typeof rate?.retailRate?.total?.[0]?.amount === "number") return rate.retailRate.total[0].amount;
  if (typeof rate?.retailRate?.total === "number") return rate.retailRate.total;
  if (typeof rate?.price === "number") return rate.price;
  if (typeof rate?.totalRate === "number") return rate.totalRate;
  if (typeof rate?.amount === "number") return rate.amount;
  if (typeof rate?.total === "number") return rate.total;
  if (typeof rate?.retailRate === "number") return rate.retailRate;
  return null;
}

function extractSSP(rate) {
  if (typeof rate?.suggestedSellingPrice === "number") return rate.suggestedSellingPrice;
  if (typeof rate?.ssp === "number") return rate.ssp;
  if (typeof rate?.retailRate?.suggestedSellingPrice === "number") return rate.retailRate.suggestedSellingPrice;
  return null;
}

// ── Frame a single rate ─────────────────────────────────────────

export function frameCUGRate(rate, currency = "GBP") {
  const wholesale = extractPrice(rate);
  if (!wholesale || wholesale <= 0) {
    return {
      ...rate,
      rate_type: "member_exclusive",
      savings_percentage: 0,
      framing_text: "Member rate — exclusive pricing",
      cug_rate: 0,
      estimated_ota_rate: 0,
      currency,
    };
  }

  const cugPrice = Math.round(wholesale * (1 + LITE_STACK_MARKUP));
  const sspRate = extractSSP(rate) || Math.round(wholesale * (1 + OTA_PREMIUM_ESTIMATE + LITE_STACK_MARKUP + 0.10));
  const savingsPct = sspRate > cugPrice ? Math.round(((sspRate - cugPrice) / sspRate) * 100) : 0;
  const s = sym(currency);

  return {
    ...rate,
    rate_type: "member_exclusive",
    cug_rate: cugPrice,
    estimated_ota_rate: sspRate,
    savings_percentage: savingsPct,
    framing_text: savingsPct > 0
      ? `${s}${cugPrice}/night — ${savingsPct}% below typical OTA price`
      : `${s}${cugPrice}/night — exclusive member rate`,
    currency,
  };
}

// ── Frame all rates in a LiteAPI response ───────────────────────

export function frameAllRates(response, currency = "GBP") {
  if (!response?.data) return response;

  const framed = { ...response };
  if (Array.isArray(framed.data)) {
    framed.data = framed.data.map((hotel) => {
      if (hotel.roomTypes && Array.isArray(hotel.roomTypes)) {
        hotel.roomTypes = hotel.roomTypes.map((room) => {
          if (room.rates && Array.isArray(room.rates)) {
            room.rates = room.rates.map((r) => frameCUGRate(r, currency));
          } else if (room.offerId) {
            return frameCUGRate(room, currency);
          }
          return room;
        });
      }
      if (hotel.rates && Array.isArray(hotel.rates)) {
        hotel.rates = hotel.rates.map((r) => frameCUGRate(r, currency));
      }
      return hotel;
    });
  }
  return framed;
}
