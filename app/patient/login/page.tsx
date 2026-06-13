"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { trackLogin } from "../../../lib/analytics";
import styles from "./login.module.scss";

type Step = "email" | "otp";

export default function PatientLoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  // After sign-in, return to ?next= when it's a safe internal patient path
  // (e.g. a follow-up booking the user was redirected away from). Falls back to
  // the dashboard otherwise — and rejects open-redirect / traversal attempts.
  const nextDest = (() => {
    const raw = search.get("next");
    return raw && raw.startsWith("/patient") && !raw.includes("..") ? raw : "/patient";
  })();

  const [step,        setStep]        = useState<Step>("email");
  const [email,       setEmail]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── Send the login code ────────────────────────────────────────────────────
  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/otp/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStep("otp");
        setOtp("");
        setResendTimer(60);
      } else {
        setError(data.error ?? "Couldn't send the code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify the code → sign in ──────────────────────────────────────────────
  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/otp/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!data.verified) {
        setError(data.error ?? "Incorrect or expired code. Please try again.");
      } else if (data.patient) {
        trackLogin();
        router.replace(nextDest);
      } else {
        // OTP valid, but no patient account exists for this email yet.
        setError("No account found for this email. Please book an appointment to get started.");
      }
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

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>
          {step === "email"
            ? "Enter your email and we'll send you a secure sign-in code."
            : "Enter the 6-digit code we just emailed you."}
        </p>

        {/* ── Step 1: email ── */}
        {step === "email" && (
          <form className={styles.form} onSubmit={sendCode} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={loading || !email.includes("@")}>
              {loading ? "Sending…" : "Send sign-in code"}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === "otp" && (
          <form className={styles.form} onSubmit={verifyCode} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="otp">
                Code sent to <strong>{email}</strong>
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                className={styles.input}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={loading || otp.length < 6}>
              {loading ? "Signing in…" : "Verify & sign in"}
            </button>

            <p className={styles.switchHint}>
              {resendTimer > 0 ? (
                <span style={{ color: "#9b8fa0" }}>Resend code in {resendTimer}s</span>
              ) : (
                <button type="button" className={styles.linkBtn} onClick={() => sendCode()} disabled={loading}>
                  Resend code
                </button>
              )}
              {"  ·  "}
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              >
                Change email
              </button>
            </p>
          </form>
        )}

        <Link href="/" className={styles.backHome}>Back to homepage</Link>
      </div>
    </div>
  );
}
