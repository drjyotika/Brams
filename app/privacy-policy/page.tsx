import { getPage } from "../../lib/pages";
import { parsePageContent } from "../../lib/page-types";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Privacy Policy — Brams Mind Care" };

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
