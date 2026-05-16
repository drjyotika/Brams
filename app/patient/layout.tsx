import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/**
 * Patient-area layout — auth-protected pages MUST NOT be indexed.
 * Login/verify/reset pages also opted out (they're transactional,
 * not informational landing pages).
 */
export const metadata: Metadata = {
  robots: {
    index:    false,
    follow:   false,
    nocache:  true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
