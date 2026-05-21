import { Suspense } from "react";
import { PatientTopNav } from "../../../components/PatientTopNav";
import { NeedHelpButton } from "../../../components/NeedHelpButton";
import { BramsLoader } from "../../../components/BramsLoader";
import { PatientBookingFlow } from "./PatientBookingFlow";

export const metadata = { title: "Book a Session — Brams Mind Care" };

export default function PatientBookPage() {
  return (
    <>
      <PatientTopNav ctaSlot={<NeedHelpButton source="patient-booking-flow" />} />
      <Suspense fallback={<BramsLoader fullPage />}>
        <PatientBookingFlow />
      </Suspense>
    </>
  );
}
