"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../create/create.module.scss";

type UserForm = {
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  password: string;
};

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<UserForm>({ username: "", full_name: "", email: "", role: "editor", is_active: true, password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm({ username: d.username ?? "", full_name: d.full_name ?? "", email: d.email ?? "", role: d.role ?? "editor", is_active: d.is_active ?? true, password: "" });
        setLoading(false);
      });
  }, [id]);

  const set = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const body: Record<string, unknown> = { username: form.username, full_name: form.full_name || null, email: form.email || null, role: form.role, is_active: form.is_active };
      if (form.password) body.password = form.password;
      const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update."); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); router.push("/admin/users"); }, 1200);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  if (loading) return <p style={{ color: "#71717a", fontSize: 14 }}>Loading…</p>;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit User</h1>
        <Link href="/admin/users" className={styles.back}>← Back to Users</Link>
      </div>

      <div className={styles.card}>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Username *</label>
              <input className={styles.input} value={form.username} onChange={set("username")} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>New Password (leave blank to keep)</label>
              <input className={styles.input} type="password" value={form.password} onChange={set("password")} minLength={8} placeholder="••••••••" />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input className={styles.input} value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" value={form.email} onChange={set("email")} />
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field} >
              <label className={styles.label}>Role *</label>
              <select className={styles.select} value={form.role} onChange={set("role")}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select className={styles.select} value={String(form.is_active)} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "true" }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
