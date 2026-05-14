"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../login/login.module.scss";

function ResetPasswordForm() {
  const router = useRouter();
  const token  = useSearchParams().get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <p className={styles.error} style={{ marginBottom: 16 }}>
          Invalid or missing reset link. Please request a new one.
        </p>
        <Link href="/patient/login" className={styles.linkBtn}>Back to login</Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/patient/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setDone(true);
        setTimeout(() => router.replace("/patient/login"), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Password updated!</p>
        <p style={{ fontSize: 13, color: "#6b7280" }}>Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={styles.input}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={styles.input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={styles.button}
        disabled={loading || !password || !confirm}
      >
        {loading ? "Saving…" : "Set new password"}
      </button>

      <p className={styles.switchHint}>
        <Link href="/patient/login" className={styles.linkBtn}>Back to login</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Brams Mind Care" className={styles.logo} />
        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>Choose a new password for your account.</p>

        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
