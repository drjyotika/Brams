import { getPage } from "../../lib/pages";
import { parsePageContent } from "../../lib/page-types";
import { PublicPageShell } from "../../components/PublicPageShell";

export const metadata = { title: "Emergency Contact — Brams Mind Care" };

export default async function EmergencyContactPage() {
  const page = await getPage("emergency-contact");
  const content = parsePageContent("emergency-contact", page?.content ?? "");

  if (content.kind !== "emergency") return null;
  const { subtitle, emergencyNote, contacts } = content.data;

  return (
    <PublicPageShell title="Emergency Contact">
      {emergencyNote && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 24,
            fontSize: 15,
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {emergencyNote}
        </div>
      )}
      {subtitle && <p>{subtitle}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        {contacts.map((c) => (
          <div
            key={c.id}
            style={{
              background: "#fff",
              border: "1px solid rgba(207,195,204,0.3)",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontWeight: 700,
                fontSize: 17,
                color: "#1e1b24",
              }}
            >
              {c.name}
            </p>
            {c.role && (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#9b8fa0" }}>
                {c.role}
              </p>
            )}
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>
              <a href={`tel:${c.phone}`} style={{ color: "#745475" }}>
                {c.phone}
              </a>
            </p>
            {c.available && (
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>
                {c.available}
              </p>
            )}
            {c.note && (
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>{c.note}</p>
            )}
          </div>
        ))}
      </div>
    </PublicPageShell>
  );
}
