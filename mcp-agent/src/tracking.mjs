/**
 * PostHog Server-Side Event Tracking (zero-dependency version)
 *
 * Uses the PostHog Capture API directly via fetch instead of posthog-node.
 * https://posthog.com/docs/api/capture
 *
 * Events:
 *   search_hotels    → ai_agent_search
 *   get_hotel_details → ai_agent_hotel_viewed
 *   pre_book         → ai_agent_booking_started
 *   complete_booking → ai_agent_booking_completed
 */

import { randomUUID } from "crypto";

const POSTHOG_CAPTURE_URL = "https://us.i.posthog.com/capture/";

let apiKey = null;
let sessionId = null;

export function getSessionId() {
  if (!sessionId) sessionId = `mcp-${randomUUID()}`;
  return sessionId;
}

export function initPostHog(key) {
  apiKey = key || null;
  if (!apiKey) {
    console.error("[tracking] No POSTHOG_PROJECT_KEY — events will be skipped");
  }
}

export async function trackEvent(event, properties = {}) {
  if (!apiKey) return;

  const distinctId = getSessionId();

  const payload = {
    api_key: apiKey,
    event,
    properties: {
      ...properties,
      distinct_id: distinctId,
      source: "mcp_agent",
      agent_session_id: distinctId,
      $lib: "lite-stack-mcp",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // Fire and forget — don't block MCP responses on analytics
    fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Silently ignore tracking failures
  }
}

export function trackSearch(params) {
  trackEvent("ai_agent_search", params);
}

export function trackHotelViewed(params) {
  trackEvent("ai_agent_hotel_viewed", params);
}

export function trackBookingStarted(params) {
  trackEvent("ai_agent_booking_started", params);
}

export function trackBookingCompleted(params) {
  trackEvent("ai_agent_booking_completed", params);
}
