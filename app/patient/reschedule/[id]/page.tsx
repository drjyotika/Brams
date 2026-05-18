import { Suspense } from "react";
import { TopNavBar } from "../../../../components/TopNavBar";
import { BramsLoader } from "../../../../components/BramsLoader";
import { defaultContent } from "../../../../lib/content";
import { PatientRescheduleFlow } from "./PatientRescheduleFlow";

export const metadata = { title: "Reschedule Appointment — Brams Mind Care" };

type Ctx = { params: Promise<{ id: string }> };

export default async function PatientReschedulePage({ params }: Ctx) {
  const { id } = await params;
  return (
    <>
      <TopNavBar data={defaultContent.nav} hideLinks />
      <Suspense fallback={<BramsLoader fullPage />}>
        <PatientRescheduleFlow appointmentId={id} />
      </Suspense>
    </>
  );
}
