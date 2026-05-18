import { getPage } from "../../lib/pages";
import { parsePageContent } from "../../lib/page-types";
import { PublicPageShell } from "../../components/PublicPageShell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentiality Agreement",
  description:
    "Our commitment to keeping every conversation, record, and document shared with Brams Mind Care strictly confidential and HIPAA-aligned.",
  alternates: { canonical: "/confidentiality" },
};

export default async function ConfidentialityPage() {
  const page = await getPage("confidentiality");
  const content = parsePageContent("confidentiality", page?.content ?? "");

  if (content.kind !== "legal") return null;
  const { lastUpdated, intro, sections } = content.data;

  return (
    <PublicPageShell title="Confidentiality Agreement">
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
