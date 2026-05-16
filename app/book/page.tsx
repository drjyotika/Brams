import { Suspense } from "react";
import { readContent } from "../../lib/storage";
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

export default async function BookPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="booking-flow" />}
      />
      <Suspense fallback={<BramsLoader fullPage />}>
        <BookingFlow />
      </Suspense>
    </>
  );
}
