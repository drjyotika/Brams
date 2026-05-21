import type { Metadata } from "next";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Share Your Feedback — Brams Mind Care",
  robots: { index: false, follow: false },
};

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  return <FeedbackForm appointmentId={appointmentId} />;
}
