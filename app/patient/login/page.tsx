"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.scss";

type Mode = "login" | "register";

export default function PatientLoginPage() {
  const router    = useRouter();
  const search    = useSearchParams();
  const initial   = (search.get("mode") === "register" ? "register" : "login") as Mode;

  const [mode,    setMode]    = useState<Mode>(initial);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // login fields
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [fullName,        setFullName]        = useState("");
  const [phone,           setPhone]           = useState("");
  const [email,           setEmail]           = useState("");
  const [regPassword,     setRegPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const switchMode = (m: Mode) => {
    setError("");
    setMode(m);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/patient/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // First-time unverified login → force email verification before
        // entering the dashboard.
        if (data.email_verified === false) {
          router.replace("/patient/verify");
        } else {
          router.replace("/patient");
        }
      } else {
        setError(data.error ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (regPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/patient/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // New accounts always need to verify before reaching the dashboard.
        router.replace("/patient/verify");
      } else {
        setError(data.error ?? "Registration failed. Please try again.");
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
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "login"
            ? "Sign in to view your appointments and records."
            : "Register to manage your bookings online."}
        </p>

        {/* Mode toggle */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
            onClick={() => switchMode("login")}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === "register" ? styles.tabActive : ""}`}
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleLogin} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="loginId">
                Phone or Email
              </label>
              <input
                id="loginId"
                type="text"
                autoComplete="username"
                required
                className={styles.input}
                placeholder="+91 9876543210 or you@example.com"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <p className={styles.switchHint}>
              New here?{" "}
              <button type="button" className={styles.linkBtn} onClick={() => switchMode("register")}>
                Create an account
              </button>
            </p>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleRegister} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">Phone</label>
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
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="regPassword">Password</label>
              <input
                id="regPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={styles.input}
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.button}
              disabled={
                loading ||
                !fullName ||
                !phone ||
                !email ||
                !regPassword ||
                !confirmPassword
              }
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p className={styles.switchHint}>
              Already have an account?{" "}
              <button type="button" className={styles.linkBtn} onClick={() => switchMode("login")}>
                Sign in
              </button>
            </p>
          </form>
        )}

        <Link href="/" className={styles.backHome}>← Back to homepage</Link>
      </div>
    </div>
  );
}
