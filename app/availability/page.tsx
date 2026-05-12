import { Suspense } from "react";
import { readContent } from "../../lib/storage";
import { TopNavBar } from "../../components/TopNavBar";
import { NeedHelpButton } from "../../components/NeedHelpButton";
import { AvailabilityChecker } from "../../components/AvailabilityChecker";
import { BramsLoader } from "../../components/BramsLoader";

export const metadata = { title: "Check Availability — Brams Mind Care" };

export default async function AvailabilityPage() {
  const content = await readContent();
  return (
    <>
      <TopNavBar
        data={content.nav}
        hideLinks
        ctaSlot={<NeedHelpButton source="availability" />}
      />
      <Suspense fallback={<BramsLoader fullPage />}>
        <AvailabilityChecker />
      </Suspense>
    </>
  );
}
