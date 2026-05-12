import { Suspense } from "react";
import { BookingSuccess } from "../../../components/BookingStatus/BookingSuccess";

export const metadata = { title: "Booking Confirmed — Brams Mind Care" };

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BookingSuccess />
    </Suspense>
  );
}
