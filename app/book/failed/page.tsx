import { Suspense } from "react";
import { readContent } from "../../../lib/storage";
import { TopNavBar } from "../../../components/TopNavBar";
import { Footer } from "../../../components/Footer";
import { BookingFailed } from "../../../components/BookingStatus/BookingFailed";

export const metadata = { title: "Payment Failed — Brams Mind Care" };

export default async function BookingFailedPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar data={content.nav} hideLinks />
      <Suspense fallback={null}>
        <BookingFailed data={content.bookingFailed} />
      </Suspense>
      <Footer data={content.footer} />
    </>
  );
}
