import { Suspense } from "react";
import { readContent } from "../../lib/storage";
import { TopNavBar } from "../../components/TopNavBar";
import { NeedHelpButton } from "../../components/NeedHelpButton";
import { BookingFlow } from "../../components/BookingFlow";

export const metadata = { title: "Book a Session — Brams Mind Care" };

export default async function BookPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="booking-flow" />}
      />
      <Suspense fallback={<div style={{ padding: 64, textAlign: "center" }}>Loading…</div>}>
        <BookingFlow />
      </Suspense>
    </>
  );
}
