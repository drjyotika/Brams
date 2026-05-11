"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./create.module.scss";

export default function CreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", passwordConfirm: "", full_name: "", email: "", role: "editor" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const { passwordConfirm: _ignore, ...payload } = form;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user."); return; }
      router.push("/admin/users");
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const pwMismatch = !!form.passwordConfirm && form.password !== form.passwordConfirm;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Create User</h1>
        <Link href="/admin/users" className={styles.back}>← Back to Users</Link>
      </div>

      <div className={styles.card}>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Username *</label>
              <input className={styles.input} value={form.username} onChange={set("username")} required />
            </div>
            <div className={styles.field} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Password *</label>
              <input
                className={styles.input}
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Re-enter Password *</label>
              <input
                className={styles.input}
                type="password"
                value={form.passwordConfirm}
                onChange={set("passwordConfirm")}
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={pwMismatch || undefined}
              />
              {pwMismatch && (
                <span style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                  Passwords do not match
                </span>
              )}
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
          <div className={styles.field} style={{ maxWidth: 200 }}>
            <label className={styles.label}>Role *</label>
            <select className={styles.select} value={form.role} onChange={set("role")}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.saveBtn} disabled={saving || pwMismatch}>
              {saving ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
