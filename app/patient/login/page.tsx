"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackLogin } from "../../../lib/analytics";
import styles from "./login.module.scss";

type Mode = "login" | "forgot";

export default function PatientLoginPage() {
  const router = useRouter();

  const [mode,       setMode]       = useState<Mode>("login");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Sign-in fields
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");

  // Forgot password field
  const [forgotId, setForgotId] = useState("");

  const switchMode = (m: Mode) => { setError(""); setForgotSent(false); setMode(m); };

  // ── Sign in ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/patient/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (res.ok) {
        trackLogin();
        router.replace(data.email_verified === false ? "/patient/verify" : "/patient");
      } else {
        setError(data.error ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────────
  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/patient/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ loginId: forgotId }),
      });
      setForgotSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Brams Mind Care" className={styles.logo} />

        <h1 className={styles.title}>
          {mode === "login" ? "Welcome back" : "Reset password"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "login"
            ? "Sign in to view your appointments and records."
            : "We'll send a reset link to your email."}
        </p>

        {/* ── Sign in form ── */}
        {mode === "login" && (
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="loginId">Email</label>
              <input
                id="loginId"
                type="email"
                autoComplete="email"
                required
                className={styles.input}
                placeholder="you@example.com"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className={styles.label} htmlFor="password">Password</label>
                <button
                  type="button"
                  className={styles.linkBtn}
                  style={{ fontSize: 11 }}
                  onClick={() => switchMode("forgot")}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !loginId || !password}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === "forgot" && (
          forgotSent ? (
            <div style={{ textAlign: "center", width: "100%", paddingTop: 8 }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📬</div>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Check your inbox</p>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                If an account exists for that email, we&apos;ve sent a reset link. It expires in 30 minutes.
              </p>
              <button type="button" className={styles.linkBtn} onClick={() => switchMode("login")}>
                ← Back to sign in
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleForgot} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="forgotId">Email</label>
                <input
                  id="forgotId"
                  type="email"
                  autoComplete="email"
                  required
                  className={styles.input}
                  placeholder="you@example.com"
                  value={forgotId}
                  onChange={e => setForgotId(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={styles.button}
                disabled={loading || !forgotId.trim()}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <p className={styles.switchHint}>
                <button type="button" className={styles.linkBtn} onClick={() => switchMode("login")}>
                  ← Back to sign in
                </button>
              </p>
            </form>
          )
        )}

        <Link href="/" className={styles.backHome}>Back to homepage</Link>
      </div>
    </div>
  );
}
