import { getPage } from "../../lib/pages";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Confidentiality Agreement — Brams Mind Care" };

export default async function ConfidentialityPage() {
  const page = await getPage("confidentiality");
  return (
    <PublicPageShell title="Confidentiality Agreement">
      {page?.content
        ? <div dangerouslySetInnerHTML={{ __html: page.content }} />
        : <p>This page is coming soon.</p>}
    </PublicPageShell>
  );
}
