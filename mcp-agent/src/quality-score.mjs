/**
 * Lite-Stack Proprietary Quality Score
 *
 * Computes a 0–10 quality score from LiteAPI hotel data.
 * This is the "data-driven authority" E-E-A-T signal.
 *
 * Algorithm (from AUTONOMOUS-LOOP-PLAN.md Workflow 9, steps 10-12):
 *   Base score from star rating: 5★=8.0, 4★=6.5, 3★=5.0
 *   Review boost:  +0.5 if rating ≥ 8.5, +1.0 if rating ≥ 9.0
 *   Volume boost:  +0.3 if reviews ≥ 500, +0.5 if ≥ 1000
 *   Amenity boost: +0.2 per premium amenity (spa, pool, restaurant, gym, beach)
 *   Capped at 10.0
 */

const PREMIUM_AMENITIES = new Set([
  "spa", "pool", "swimming pool", "restaurant", "gym", "fitness",
  "fitness center", "fitness centre", "beach", "private beach",
  "rooftop pool", "infinity pool", "concierge", "butler service",
  "valet parking",
]);

export function computeQualityScore({ starRating, reviewScore, reviewCount, amenities }) {
  // Base from star rating
  let base = 5.0;
  if (starRating) {
    if (starRating >= 5) base = 8.0;
    else if (starRating >= 4) base = 6.5;
    else if (starRating >= 3) base = 5.0;
    else if (starRating >= 2) base = 3.5;
    else base = 2.0;
  }

  // Review score boost
  let reviewBoost = 0;
  if (reviewScore) {
    if (reviewScore >= 9.0) reviewBoost = 1.0;
    else if (reviewScore >= 8.5) reviewBoost = 0.5;
    else if (reviewScore >= 8.0) reviewBoost = 0.2;
  }

  // Review volume boost
  let volumeBoost = 0;
  if (reviewCount) {
    if (reviewCount >= 1000) volumeBoost = 0.5;
    else if (reviewCount >= 500) volumeBoost = 0.3;
    else if (reviewCount >= 100) volumeBoost = 0.1;
  }

  // Amenity boost
  let amenityBoost = 0;
  if (amenities && Array.isArray(amenities)) {
    for (const a of amenities) {
      const name = typeof a === "string" ? a : a?.name || a?.title || "";
      if (PREMIUM_AMENITIES.has(name.toLowerCase().trim())) {
        amenityBoost += 0.2;
      }
    }
  }

  const raw = base + reviewBoost + volumeBoost + amenityBoost;
  const score = Math.min(10.0, Math.round(raw * 10) / 10);

  let label;
  if (score >= 9.0) label = "Exceptional";
  else if (score >= 8.0) label = "Outstanding";
  else if (score >= 7.0) label = "Very Good";
  else if (score >= 6.0) label = "Good";
  else if (score >= 5.0) label = "Average";
  else label = "Below Average";

  return {
    lite_stack_quality_score: score,
    quality_label: label,
    score_breakdown: { base, review_boost: reviewBoost, volume_boost: volumeBoost, amenity_boost: amenityBoost },
  };
}
