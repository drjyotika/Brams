"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./slug.module.scss";

const PAGE_META: Record<string, { title: string; url: string }> = {
  "privacy-policy":    { title: "Privacy Policy",            url: "/privacy-policy"    },
  "confidentiality":   { title: "Confidentiality Agreement", url: "/confidentiality"   },
  "terms":             { title: "Terms of Service",          url: "/terms"             },
  "emergency-contact": { title: "Emergency Contact",         url: "/emergency-contact" },
  "contact":           { title: "Contact Us",                url: "/contact"           },
};

export default function PageEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const meta = PAGE_META[slug];
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/pages/${slug}`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content ?? ""); setLoading(false); });
  }, [slug]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!meta) return <p style={{ color: "#71717a" }}>Unknown page: {slug}</p>;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{meta.title}</h1>
          <a href={meta.url} target="_blank" rel="noreferrer" className={styles.preview}>
            Preview ↗
          </a>
        </div>
        <Link href="/admin/pages" className={styles.back}>← All Pages</Link>
      </div>

      <div className={styles.hint}>
        Content supports HTML. Use &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a&gt; etc.
      </div>

      {loading ? (
        <p style={{ color: "#71717a", fontSize: 14 }}>Loading…</p>
      ) : (
        <div className={styles.card}>
          <textarea
            className={styles.editor}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter content for ${meta.title}…`}
          />
          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span className={styles.savedBadge}>✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
