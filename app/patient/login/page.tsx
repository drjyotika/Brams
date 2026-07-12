"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { trackLogin } from "../../../lib/analytics";
import styles from "./login.module.scss";

type Step = "email" | "otp" | "details";

// useSearchParams() must sit inside a Suspense boundary or the production build
// de-opts the whole page (which can blank the login screen — notably on mobile).
export default function PatientLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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
  const [fullName,    setFullName]    = useState("");
  const [phone,       setPhone]       = useState("");
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
        // Existing account — signed in.
        trackLogin();
        router.replace(nextDest);
      } else {
        // OTP valid but no account yet → collect a few details to create one.
        setStep("details");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── New user — create the account, then sign in ─────────────────────────────
  const completeSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (phone.replace(/\D/g, "").length < 8) { setError("Please enter a valid phone number."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/patient/complete-signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), full_name: fullName.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        trackLogin();
        router.replace(nextDest);
      } else {
        setError(data.error ?? "Couldn't create your account. Please try again.");
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

        <h1 className={styles.title}>
          {step === "details" ? "Create your account" : "Welcome"}
        </h1>
        <p className={styles.subtitle}>
          {step === "email"
            ? "Enter your email and we'll send you a secure sign-in code."
            : step === "otp"
            ? "Enter the 6-digit code we just emailed you."
            : "Your email is verified. Add a couple of details to finish."}
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

        {/* ── Step 3: new-user details ── */}
        {step === "details" && (
          <form className={styles.form} onSubmit={completeSignup} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                className={styles.input}
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                required
                className={styles.input}
                placeholder="+91 9876 543 210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Creating account…" : "Create account & sign in"}
            </button>
          </form>
        )}

        <Link href="/" className={styles.backHome}>Back to homepage</Link>
      </div>
    </div>
  );
}
