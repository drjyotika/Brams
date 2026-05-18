import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminShell from "./AdminShell";

/**
 * Admin server-side wrapper — exists purely to attach noindex metadata.
 * The interactive shell lives in `AdminShell.tsx` (client component).
 */
export const metadata: Metadata = {
  robots: {
    index:  false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
