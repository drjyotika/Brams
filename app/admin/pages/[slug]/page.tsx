"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  parsePageContent,
  getDefaultContent,
  type PageContent,
  type LegalContent,
  type LegalSection,
  type EmergencyContent,
  type EmergencyContactItem,
  type ContactInfoContent,
} from "../../../../lib/page-types";
import styles from "../../../admin/admin.module.scss";
import edStyles from "./slug.module.scss";
import { BramsLoader } from "../../../../components/BramsLoader";

// ─── Page meta ─────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { title: string; url: string }> = {
  "privacy-policy":    { title: "Privacy Policy",            url: "/privacy-policy"    },
  "confidentiality":   { title: "Confidentiality Agreement", url: "/confidentiality"   },
  "terms":             { title: "Terms of Service",          url: "/terms"             },
  "emergency-contact": { title: "Emergency Contact",         url: "/emergency-contact" },
  "contact":           { title: "Contact Us",                url: "/contact"           },
};

// ─── Save helpers ──────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "ok" | "err";

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle")   return null;
  if (status === "saving") return <span className={styles.status}>Saving…</span>;
  if (status === "ok")     return <span className={`${styles.status} ${styles.statusOk}`}>Saved</span>;
  return <span className={`${styles.status} ${styles.statusErr}`}>Error — try again</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

// ─── Legal editor ──────────────────────────────────────────────────────────────

function LegalEditor({
  slug,
  data,
  onChange,
}: {
  slug: string;
  data: LegalContent;
  onChange: (v: LegalContent) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const setSection = (idx: number, patch: Partial<LegalSection>) =>
    onChange({
      ...data,
      sections: data.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });

  const removeSection = (idx: number) =>
    onChange({ ...data, sections: data.sections.filter((_, i) => i !== idx) });

  const addSection = () =>
    onChange({
      ...data,
      sections: [...data.sections, { id: `s-${Date.now()}`, heading: "", body: "" }],
    });

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify({ kind: "legal", data }) }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("err");
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.row}>
        <Field label="Last updated">
          <input
            className={styles.input}
            value={data.lastUpdated}
            onChange={(e) => onChange({ ...data, lastUpdated: e.target.value })}
            placeholder="e.g. May 2024"
          />
        </Field>
      </div>

      <Field label="Intro paragraph">
        <textarea
          className={styles.textarea}
          value={data.intro}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
        />
      </Field>

      <p className={styles.panelHint} style={{ marginTop: 8 }}>Sections</p>

      {data.sections.map((s, i) => (
        <div key={s.id} className={styles.cardArrayItem}>
          <div className={styles.cardArrayHead}>
            <span>Section {i + 1}</span>
            <button type="button" className={styles.danger} onClick={() => removeSection(i)}>
              Remove
            </button>
          </div>
          <Field label="Heading">
            <input
              className={styles.input}
              value={s.heading}
              onChange={(e) => setSection(i, { heading: e.target.value })}
            />
          </Field>
          <Field label="Body">
            <textarea
              className={styles.textarea}
              value={s.body}
              onChange={(e) => setSection(i, { body: e.target.value })}
            />
          </Field>
        </div>
      ))}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={addSection}>
          + Add Section
        </button>
        <button type="button" className={styles.primary} onClick={save}>
          Save
        </button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

// ─── Emergency editor ──────────────────────────────────────────────────────────

function EmergencyEditor({
  slug,
  data,
  onChange,
}: {
  slug: string;
  data: EmergencyContent;
  onChange: (v: EmergencyContent) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const setContact = (idx: number, patch: Partial<EmergencyContactItem>) =>
    onChange({
      ...data,
      contacts: data.contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    });

  const removeContact = (idx: number) =>
    onChange({ ...data, contacts: data.contacts.filter((_, i) => i !== idx) });

  const addContact = () =>
    onChange({
      ...data,
      contacts: [
        ...data.contacts,
        { id: `c-${Date.now()}`, name: "", role: "", phone: "", available: "", note: "" },
      ],
    });

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify({ kind: "emergency", data }) }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("err");
    }
  };

  return (
    <section className={styles.panel}>
      <Field label="Subtitle">
        <textarea
          className={styles.textarea}
          value={data.subtitle}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
        />
      </Field>

      <Field label="Emergency notice (shown at top)">
        <textarea
          className={styles.textarea}
          value={data.emergencyNote}
          onChange={(e) => onChange({ ...data, emergencyNote: e.target.value })}
        />
      </Field>

      <p className={styles.panelHint} style={{ marginTop: 8 }}>Contacts / Helplines</p>

      {data.contacts.map((c, i) => (
        <div key={c.id} className={styles.cardArrayItem}>
          <div className={styles.cardArrayHead}>
            <span>Contact {i + 1}</span>
            <button type="button" className={styles.danger} onClick={() => removeContact(i)}>
              Remove
            </button>
          </div>
          <div className={styles.row}>
            <Field label="Name">
              <input
                className={styles.input}
                value={c.name}
                onChange={(e) => setContact(i, { name: e.target.value })}
              />
            </Field>
            <Field label="Role / Organisation">
              <input
                className={styles.input}
                value={c.role}
                onChange={(e) => setContact(i, { role: e.target.value })}
              />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="Phone number">
              <input
                className={styles.input}
                value={c.phone}
                onChange={(e) => setContact(i, { phone: e.target.value })}
              />
            </Field>
            <Field label="Available">
              <input
                className={styles.input}
                value={c.available}
                onChange={(e) => setContact(i, { available: e.target.value })}
                placeholder="e.g. 24/7"
              />
            </Field>
          </div>
          <Field label="Note">
            <input
              className={styles.input}
              value={c.note}
              onChange={(e) => setContact(i, { note: e.target.value })}
            />
          </Field>
        </div>
      ))}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={addContact}>
          + Add Contact
        </button>
        <button type="button" className={styles.primary} onClick={save}>
          Save
        </button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

// ─── Contact info editor ───────────────────────────────────────────────────────

function ContactInfoEditor({
  slug,
  data,
  onChange,
}: {
  slug: string;
  data: ContactInfoContent;
  onChange: (v: ContactInfoContent) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const set = <K extends keyof ContactInfoContent>(k: K, v: ContactInfoContent[K]) =>
    onChange({ ...data, [k]: v });

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch(`/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify({ kind: "contact-info", data }) }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("err");
    }
  };

  return (
    <section className={styles.panel}>
      <Field label="Subtitle">
        <textarea
          className={styles.textarea}
          value={data.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
        />
      </Field>
      <div className={styles.row}>
        <Field label="Phone">
          <input
            className={styles.input}
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className={styles.input}
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Address">
        <textarea
          className={styles.textarea}
          value={data.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </Field>
      <Field label="Office hours">
        <input
          className={styles.input}
          value={data.hours}
          onChange={(e) => set("hours", e.target.value)}
          placeholder="e.g. Mon–Sat, 10am–7pm"
        />
      </Field>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={save}>
          Save
        </button>
        <StatusBadge status={status} />
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PageEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const meta = PAGE_META[slug];
  const [content, setContent] = useState<PageContent | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/pages/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        const raw: string = d.content ?? "";
        setContent(raw ? parsePageContent(slug, raw) : getDefaultContent(slug));
      });
  }, [slug]);

  if (!meta) return <p style={{ color: "#71717a" }}>Unknown page: {slug}</p>;

  return (
    <div>
      <div className={edStyles.header}>
        <div>
          <h1 className={edStyles.title}>{meta.title}</h1>
          <a href={meta.url} target="_blank" rel="noreferrer" className={edStyles.preview}>
            Preview ↗
          </a>
        </div>
        <Link href="/admin/pages" className={edStyles.back}>
          ← All Pages
        </Link>
      </div>

      {!content ? (
        <BramsLoader />
      ) : content.kind === "legal" ? (
        <LegalEditor
          slug={slug}
          data={content.data}
          onChange={(data) => setContent({ kind: "legal", data })}
        />
      ) : content.kind === "emergency" ? (
        <EmergencyEditor
          slug={slug}
          data={content.data}
          onChange={(data) => setContent({ kind: "emergency", data })}
        />
      ) : (
        <ContactInfoEditor
          slug={slug}
          data={content.data}
          onChange={(data) => setContent({ kind: "contact-info", data })}
        />
      )}
    </div>
  );
}
