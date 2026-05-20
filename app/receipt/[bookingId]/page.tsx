import type { Metadata } from "next";
import { ReceiptView } from "./ReceiptView";

export const metadata: Metadata = {
  title: "Booking Receipt — Brams Mind Care",
  robots: { index: false, follow: false },
};

export default async function ReceiptPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <ReceiptView bookingId={bookingId} />;
}
