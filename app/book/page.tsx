import { Suspense } from "react";
import { BookingFlow } from "../../components/BookingFlow";

export const metadata = { title: "Book a Session — Brams Mind Care" };

export default function BookPage() {
  return (
    <Suspense fallback={<div style={{ padding: 64, textAlign: "center" }}>Loading…</div>}>
      <BookingFlow />
    </Suspense>
  );
}
