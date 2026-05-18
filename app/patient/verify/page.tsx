"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./verify.module.scss";

type Mode = "idle" | "verifying" | "resending" | "ok" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const tokenFromUrl = search.get("token");

  const [otp,    setOtp]    = useState("");
  const [email,  setEmail]  = useState<string | null>(null);
  const [status, setStatus] = useState<Mode>("idle");
  const [msg,    setMsg]    = useState("");
  const autoTriedRef = useRef(false);

  // Hydrate the email shown in the UI from the current session
  useEffect(() => {
    fetch("/api/patient/me").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setEmail(data.patient?.email ?? null);
      if (data.patient?.email_verified) router.replace("/patient");
    }).catch(() => { /* fine */ });
  }, [router]);

  // If the user landed here via a magic link, auto-submit the token
  useEffect(() => {
    if (!tokenFromUrl || autoTriedRef.current) return;
    autoTriedRef.current = true;
    void submitVerification({ token: tokenFromUrl });
  }, [tokenFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitVerification(payload: { otp?: string; token?: string }) {
    setStatus("verifying");
    setMsg("");
    try {
      const res = await fetch("/api/patient/auth/verify-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("ok");
        setMsg("Email verified! Taking you to your dashboard…");
        setTimeout(() => router.replace("/patient"), 900);
      } else {
        setStatus("error");
        setMsg(data.error ?? "Verification failed.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setStatus("error");
      setMsg("Please enter the 6-digit code from your email.");
      return;
    }
    void submitVerification({ otp });
  };

  const handleResend = async () => {
    setStatus("resending");
    setMsg("");
    try {
      const res = await fetch("/api/patient/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("idle");
        setMsg("A new code has been sent. Please check your inbox.");
      } else {
        setStatus("error");
        setMsg(data.error ?? "Could not resend the code.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/patient/auth/logout", { method: "POST" });
    router.replace("/patient/login");
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Brams Mind Care" className={styles.logo} />

        <h1 className={styles.title}>Verify your email</h1>
        <p className={styles.subtitle}>
          We&rsquo;ve sent a 6-digit verification code to
          {email ? <> <strong>{email}</strong></> : " your inbox"}.
          Enter it below, or click the link in the email.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className={styles.otpInput}
            placeholder="123 456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={status === "verifying" || status === "ok"}
            aria-label="6-digit verification code"
          />

          {msg && (
            <p className={`${styles.message} ${status === "ok" ? styles.messageOk : status === "error" ? styles.messageErr : ""}`}>
              {msg}
            </p>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={status === "verifying" || status === "ok" || otp.length !== 6}
          >
            {status === "verifying" ? "Verifying…" : "Verify Email"}
          </button>
        </form>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={handleResend}
            disabled={status === "resending" || status === "verifying" || status === "ok"}
          >
            {status === "resending" ? "Sending…" : "Resend code"}
          </button>
          <span className={styles.dot}>·</span>
          <button type="button" className={styles.linkBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>

        <Link href="/" className={styles.backHome}>Back to homepage</Link>
      </div>
    </div>
  );
}
