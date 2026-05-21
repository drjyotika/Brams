// Thin wrapper over GA4 (gtag) event sending via @next/third-parties.
//
// Centralises all custom analytics events so names/params stay consistent and
// calls fail silently if GA isn't loaded (e.g. NEXT_PUBLIC_GA_ID unset locally).

import { sendGAEvent } from "@next/third-parties/google";

type Params = Record<string, string | number | boolean | undefined>;

function track(name: string, params: Params = {}): void {
  try {
    sendGAEvent("event", name, params);
  } catch {
    /* GA not loaded — no-op */
  }
}

// ─── Booking funnel ────────────────────────────────────────────────────────────

/** "Pay" pressed → Razorpay opening (GA4 recommended funnel event). */
export const trackBeginCheckout = (planTitle: string, amountPaise: number) =>
  track("begin_checkout", {
    item_name: planTitle,
    value:     amountPaise / 100,
    currency:  "INR",
  });

/** Payment succeeded — THE conversion (GA4 recommended `purchase`). */
export const trackPurchase = (
  bookingId: string,
  planTitle: string,
  amountPaise: number,
) =>
  track("purchase", {
    transaction_id: bookingId,
    item_name:      planTitle,
    value:          amountPaise / 100,
    currency:       "INR",
  });

/** Payment attempt failed. */
export const trackPaymentFailed = (planTitle: string) =>
  track("payment_failed", { item_name: planTitle });

/** Coupon successfully applied. */
export const trackCouponApplied = (code: string) =>
  track("coupon_applied", { coupon: code });

// ─── Lead generation ────────────────────────────────────────────────────────────

/** GA4 recommended `generate_lead` — used for contact / help / alt-slot / newsletter. */
export const trackLead = (source: string) =>
  track("generate_lead", { lead_source: source });

// ─── Engagement / account ────────────────────────────────────────────────────────

export const trackLogin       = () => track("login",   { method: "password" });
export const trackAddToCalendar = () => track("add_to_calendar");
export const trackJoinCall    = () => track("join_call");
export const trackReschedule  = () => track("reschedule");
export const trackFeedback    = (rating: number) => track("feedback_submitted", { rating });
