import { getPage } from "../../lib/pages";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Terms of Service — Brams Mind Care" };

export default async function TermsPage() {
  const page = await getPage("terms");
  return (
    <PublicPageShell title="Terms of Service">
      {page?.content
        ? <div dangerouslySetInnerHTML={{ __html: page.content }} />
        : <p>This page is coming soon.</p>}
    </PublicPageShell>
  );
}
