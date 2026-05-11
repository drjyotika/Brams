import { getPage } from "../../lib/pages";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Emergency Contact — Brams Mind Care" };

export default async function EmergencyContactPage() {
  const page = await getPage("emergency-contact");
  return (
    <PublicPageShell title="Emergency Contact">
      {page?.content
        ? <div dangerouslySetInnerHTML={{ __html: page.content }} />
        : <p>This page is coming soon.</p>}
    </PublicPageShell>
  );
}
