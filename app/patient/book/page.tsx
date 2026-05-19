import { Suspense } from "react";
import { TopNavBar } from "../../../components/TopNavBar";
import { NeedHelpButton } from "../../../components/NeedHelpButton";
import { BramsLoader } from "../../../components/BramsLoader";
import { defaultContent } from "../../../lib/content";
import { PatientBookingFlow } from "./PatientBookingFlow";

export const metadata = { title: "Book a Session — Brams Mind Care" };

export default function PatientBookPage() {
  return (
    <>
      <TopNavBar
        data={defaultContent.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="patient-booking-flow" />}
        mobileMenuItems={[]}
      />
      <Suspense fallback={<BramsLoader fullPage />}>
        <PatientBookingFlow />
      </Suspense>
    </>
  );
}
