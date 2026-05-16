import { getPage } from "../../lib/pages";
import { parsePageContent } from "../../lib/page-types";
import { PublicPageShell } from "../../components/PublicPageShell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Brams Mind Care collects, uses, and protects your personal and medical information when you book and attend online psychiatric consultations with Dr. Jyotika Kanwar.",
  alternates: { canonical: "/privacy-policy" },
};

export default async function PrivacyPolicyPage() {
  const page = await getPage("privacy-policy");
  const content = parsePageContent("privacy-policy", page?.content ?? "");

  if (content.kind !== "legal") return null;
  const { lastUpdated, intro, sections } = content.data;

  return (
    <PublicPageShell title="Privacy Policy">
      {lastUpdated && (
        <p style={{ fontSize: 13, color: "#9b8fa0", marginBottom: 24 }}>
          Last updated: {lastUpdated}
        </p>
      )}
      {intro && <p>{intro}</p>}
      {sections.map((s) => (
        <div key={s.id}>
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </div>
      ))}
    </PublicPageShell>
  );
}
