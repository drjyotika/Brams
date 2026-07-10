"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "../../../lib/config";
import adminStyles from "../admin.module.scss";
import styles from "./blog.module.scss";

export type PostFormValues = {
  id?:               string;
  slug:              string;
  title:             string;
  excerpt:           string;
  cover_image:       string;
  body_markdown:     string;
  meta_title:        string;
  meta_description:  string;
  tags:              string; // comma-separated in the UI
  status:            "draft" | "published";
};

export const EMPTY_POST: PostFormValues = {
  slug: "", title: "", excerpt: "", cover_image: "", body_markdown: "",
  meta_title: "", meta_description: "", tags: "", status: "draft",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={adminStyles.field}>
      <span className={adminStyles.label}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: "#9b8fa0" }}>{hint}</span>}
    </label>
  );
}

function ImageUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/admin/media/upload`, { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error ?? `HTTP ${res.status}`);
      onChange(d.url);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Field label="Cover image">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={styles.thumb} />
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} style={{ display: "none" }} />
          <button type="button" className={adminStyles.secondary} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload image"}
          </button>
        </div>
        <input className={adminStyles.input} value={value} placeholder="Uploaded URL, or paste one" onChange={(e) => onChange(e.target.value)} />
        {err && <span style={{ color: "#dc2626", fontSize: 12 }}>{err}</span>}
      </div>
    </Field>
  );
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
}

export function PostForm({
  initial,
  postId,
}: {
  initial: PostFormValues;
  postId?: string;
}) {
  const router = useRouter();
  const [form, setForm]       = useState<PostFormValues>(initial);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [slugTouched, setSlugTouched] = useState(!!postId); // don't auto-slug when editing an existing post

  const set = <K extends keyof PostFormValues>(k: K, v: PostFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(status: PostFormValues["status"]) {
    setError("");
    if (!form.title.trim())         { setError("Title is required."); return; }
    if (!form.body_markdown.trim()) { setError("Body content is required."); return; }

    setSaving(true);
    try {
      const payload = {
        slug:              form.slug.trim() || slugify(form.title),
        title:             form.title.trim(),
        excerpt:           form.excerpt,
        cover_image:       form.cover_image,
        body_markdown:     form.body_markdown,
        meta_title:        form.meta_title,
        meta_description:  form.meta_description,
        tags:              form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
      };

      const url    = postId ? `${API_BASE}/admin/blog/${postId}` : `${API_BASE}/admin/blog`;
      const method = postId ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d      = await res.json();
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);

      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={adminStyles.panel}>
      {error && <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>}

      <Field label="Title">
        <input
          className={adminStyles.input}
          value={form.title}
          onChange={(e) => {
            const title = e.target.value;
            set("title", title);
            if (!slugTouched) set("slug", slugify(title));
          }}
        />
      </Field>

      <Field label="URL slug" hint={`/blog/${form.slug || slugify(form.title) || "…"}`}>
        <input
          className={adminStyles.input}
          value={form.slug}
          onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
        />
      </Field>

      <Field label="Excerpt" hint="Shown on the blog index and used as a fallback meta description.">
        <textarea className={adminStyles.textarea} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </Field>

      <ImageUploadField value={form.cover_image} onChange={(url) => set("cover_image", url)} />

      <Field label="Body (Markdown)">
        <textarea
          className={`${adminStyles.textarea} ${styles.markdownArea}`}
          value={form.body_markdown}
          onChange={(e) => set("body_markdown", e.target.value)}
        />
      </Field>

      <div className={adminStyles.row}>
        <Field label="Meta title (SEO)" hint="Falls back to the title if left blank.">
          <input className={adminStyles.input} value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. anxiety, therapy">
          <input className={adminStyles.input} value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </Field>
      </div>
      <Field label="Meta description (SEO)" hint="Falls back to the excerpt if left blank.">
        <textarea className={adminStyles.textarea} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
      </Field>

      <div className={adminStyles.actions} style={{ marginTop: 8 }}>
        <button type="button" className={adminStyles.secondary} onClick={() => save("draft")} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button type="button" className={adminStyles.primary} onClick={() => save("published")} disabled={saving}>
          {saving ? "Publishing…" : form.status === "published" ? "Save & keep published" : "Publish"}
        </button>
      </div>
    </div>
  );
}
