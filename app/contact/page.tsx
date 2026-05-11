import { getPage } from "../../lib/pages";
import { PublicPageShell } from "../../components/PublicPageShell";
import { ContactForm } from "../../components/ContactForm";

export const metadata = { title: "Contact Us — Brams Mind Care" };

export default async function ContactPage() {
  const page = await getPage("contact");
  return (
    <PublicPageShell title="Contact Us">
      {page?.content && <div dangerouslySetInnerHTML={{ __html: page.content }} />}
      <ContactForm />
    </PublicPageShell>
  );
}
