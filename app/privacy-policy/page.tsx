import { getPage } from "../../lib/pages";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Privacy Policy — Brams Mind Care" };

export default async function PrivacyPolicyPage() {
  const page = await getPage("privacy-policy");
  return (
    <PublicPageShell title="Privacy Policy">
      {page?.content
        ? <div dangerouslySetInnerHTML={{ __html: page.content }} />
        : <p>This page is coming soon.</p>}
    </PublicPageShell>
  );
}
