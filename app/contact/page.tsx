import { getPage } from "../../lib/pages";
import { parsePageContent } from "../../lib/page-types";
import { PublicPageShell } from "../../components/PublicPageShell";
import { ContactForm } from "../../components/ContactForm";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Brams Mind Care for general queries, support, or to book an online psychiatric consultation with Dr. Jyotika Kanwar.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const page = await getPage("contact");
  const content = parsePageContent("contact", page?.content ?? "");

  const info = content.kind === "contact-info" ? content.data : null;

  return (
    <PublicPageShell title="Contact Us">
      {info?.subtitle && <p style={{ marginBottom: 32 }}>{info.subtitle}</p>}

      {info && (info.phone || info.email || info.address || info.hours) && (
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(207,195,204,0.3)",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 40,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {info.phone && (
            <p style={{ margin: 0, fontSize: 15 }}>
              <strong style={{ display: "inline-block", minWidth: 80 }}>Phone</strong>
              <a href={`tel:${info.phone}`} style={{ color: "#745475" }}>
                {info.phone}
              </a>
            </p>
          )}
          {info.email && (
            <p style={{ margin: 0, fontSize: 15 }}>
              <strong style={{ display: "inline-block", minWidth: 80 }}>Email</strong>
              <a href={`mailto:${info.email}`} style={{ color: "#745475" }}>
                {info.email}
              </a>
            </p>
          )}
          {info.address && (
            <p style={{ margin: 0, fontSize: 15 }}>
              <strong style={{ display: "inline-block", minWidth: 80 }}>Address</strong>
              {info.address}
            </p>
          )}
          {info.hours && (
            <p style={{ margin: 0, fontSize: 15 }}>
              <strong style={{ display: "inline-block", minWidth: 80 }}>Hours</strong>
              {info.hours}
            </p>
          )}
        </div>
      )}

      <ContactForm />
    </PublicPageShell>
  );
}
