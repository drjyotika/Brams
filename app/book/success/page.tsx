import { Suspense } from "react";
import { readContent } from "../../../lib/storage";
import { TopNavBar } from "../../../components/TopNavBar";
import { NeedHelpButton } from "../../../components/NeedHelpButton";
import { BookingSuccess } from "../../../components/BookingStatus/BookingSuccess";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  robots: { index: false, follow: false },
};

export default async function BookingSuccessPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="booking-flow" />}
      />
      <Suspense fallback={null}>
        <BookingSuccess data={content.bookingSuccess} />
      </Suspense>
    </>
  );
}
