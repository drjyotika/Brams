import { Suspense } from "react";
import { readContent } from "../../../lib/storage";
import { BookingSuccess } from "../../../components/BookingStatus/BookingSuccess";

export const metadata = { title: "Booking Confirmed — Brams Mind Care" };

export default async function BookingSuccessPage() {
  const content = await readContent();
  return (
    <Suspense fallback={null}>
      <BookingSuccess data={content.bookingSuccess} />
    </Suspense>
  );
}
