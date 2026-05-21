import { Suspense } from "react";
import { PatientTopNav } from "../../../../components/PatientTopNav";
import { BramsLoader } from "../../../../components/BramsLoader";
import { PatientRescheduleFlow } from "./PatientRescheduleFlow";

export const metadata = { title: "Reschedule Appointment — Brams Mind Care" };

type Ctx = { params: Promise<{ id: string }> };

export default async function PatientReschedulePage({ params }: Ctx) {
  const { id } = await params;
  return (
    <>
      <PatientTopNav />
      <Suspense fallback={<BramsLoader fullPage />}>
        <PatientRescheduleFlow appointmentId={id} />
      </Suspense>
    </>
  );
}
