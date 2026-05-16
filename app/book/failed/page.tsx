import { Suspense } from "react";
import { readContent } from "../../../lib/storage";
import { TopNavBar } from "../../../components/TopNavBar";
import { NeedHelpButton } from "../../../components/NeedHelpButton";
import { Footer } from "../../../components/Footer";
import { BookingFailed } from "../../../components/BookingStatus/BookingFailed";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Failed",
  robots: { index: false, follow: false },
};

export default async function BookingFailedPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="booking-flow" />}
      />
      <Suspense fallback={null}>
        <BookingFailed data={content.bookingFailed} />
      </Suspense>
      <Footer data={content.footer} />
    </>
  );
}
