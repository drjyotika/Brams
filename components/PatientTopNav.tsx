"use client";

import type { ReactNode } from "react";
import { TopNavBar } from "./TopNavBar";
import { defaultContent } from "../lib/content";

/**
 * Shared patient-flow top nav so the mobile hamburger menu is identical across
 * every patient page (dashboard, booking steps, reschedule, etc.).
 *
 * Menu items deep-link into the dashboard tabs via `?tab=` and include Logout.
 */
const PATIENT_TABS = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "appointments", label: "Appointments" },
  { id: "reports",      label: "Files & Reports" },
  { id: "profile",      label: "Profile" },
] as const;

export function PatientTopNav({ ctaSlot }: { ctaSlot?: ReactNode }) {
  async function logout() {
    await fetch("/api/patient/auth/logout", { method: "POST" });
    window.location.href = "/patient/login";
  }

  return (
    <TopNavBar
      data={defaultContent.nav}
      hideLinks
      ctaSlot={ctaSlot}
      mobileMenuItems={[
        ...PATIENT_TABS.map((t) => ({ label: t.label, href: `/patient?tab=${t.id}` })),
        { label: "Logout", onClick: logout, variant: "danger" as const },
      ]}
    />
  );
}
