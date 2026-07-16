import { Suspense } from "react";
import { readContent } from "../../lib/storage";
import { parsePriceToPaise, parseDurationMinutes } from "../../lib/plans";
import { TopNavBar } from "../../components/TopNavBar";
import { NeedHelpButton } from "../../components/NeedHelpButton";
import { BookingFlow } from "../../components/BookingFlow";
import { BramsLoader } from "../../components/BramsLoader";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Session",
  description:
    "Book a confidential online psychiatric consultation with Dr. Jyotika Kanwar. Choose your plan, pick a time, and join from anywhere in India over a secure video link.",
  alternates: { canonical: "/book" },
};

type Props = { searchParams: Promise<{ plan?: string }> };

export default async function BookPage({ searchParams }: Props) {
  const [content, { plan: planParam }] = await Promise.all([readContent(), searchParams]);

  // Resolve the selected plan server-side so its title/price/description are
  // present in the initial HTML — the whole flow used to be 100% client-fetched,
  // which left crawlers seeing only a loading spinner (flagged as a Soft 404 in
  // Search Console). Follow-up is skipped: it requires an auth check that can
  // only run client-side.
  const planId = planParam ?? "initial";
  const rawPlan = planId === "follow-up" ? null : content.pricing.plans.find((p) => p.id === planId) ?? null;
  const initialPlan = rawPlan
    ? {
        id:               rawPlan.id,
        title:            rawPlan.title,
        eyebrow:          rawPlan.eyebrow,
        price:            rawPlan.price,
        unit:             rawPlan.unit,
        price_paise:      parsePriceToPaise(rawPlan.price),
        duration_minutes: parseDurationMinutes(rawPlan.unit),
      }
    : null;

  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={
          <div className="topnav-cta-row">
            <a href="/patient/login" className="topnav-login-link">Patient Login</a>
            <NeedHelpButton source="booking-flow" />
          </div>
        }
        mobileMenuItems={[
          { label: "Patient Login", href: "/patient/login" },
        ]}
      />
      <Suspense fallback={<BramsLoader fullPage />}>
        <BookingFlow
          initialPlan={initialPlan}
          initialStep1Config={content.bookingStep1}
          initialStep2Config={content.bookingStep2}
        />
      </Suspense>
    </>
  );
}
