"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PatientDetails, PlanInfo } from "./index";
import type { BookingField } from "../../lib/content";
import { StickyFooter } from "./StickyFooter";
import { trackBeginCheckout, trackPurchase, trackPaymentFailed, trackCouponApplied } from "../../lib/analytics";
import styles from "./BookingFlow.module.scss";
import dStyles from "./StepDetails.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type WelcomeBackPatient = {
  id:        string;
  full_name: string;
  phone:     string;
  email:     string | null;
  age:       number | null;
  gender:    string | null;
  city:      string | null;
};

type CouponResult = {
  discount_paise: number;
  final_paise:    number;
  code:           string;
  discount_type:  "percent" | "fixed";
  discount_value: number;
};

// ─── Razorpay loader ──────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if ((window as Window & { Razorpay?: unknown }).Razorpay) { resolve(true); return; }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) { existing.addEventListener("load", () => resolve(true)); return; }
    const script = document.createElement("script");
    script.id  = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatTime(time24: string): string {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map((s) => parseInt(s, 10));
  const ampm = h >= 12 ? "PM" : "AM";
  const hh   = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StepDetails({
  plan,
  scheduledDate,
  scheduledTime,
  fields,
  details,
  onChange,
  onBack,
  skipEmailVerification = false,
  successPath,
}: {
  plan: PlanInfo;
  scheduledDate: string;
  scheduledTime: string;
  fields: BookingField[];
  details: PatientDetails;
  onChange: (v: PatientDetails) => void;
  onBack: () => void;
  /** When true the OTP widget is hidden and email is treated as already verified. */
  skipEmailVerification?: boolean;
  /** Override where the user is sent after payment (default: /book/success). */
  successPath?: string;
}) {
  const router = useRouter();
  const bookingIdRef = useRef<string | null>(null);

  // Payment
  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Email OTP state ────────────────────────────────────────────────────────
  const [otpSent,       setOtpSent]       = useState(false);
  const [otpSending,    setOtpSending]    = useState(false);
  const [otpValue,      setOtpValue]      = useState("");
  const [otpVerifying,  setOtpVerifying]  = useState(false);
  const [otpError,      setOtpError]      = useState<string | null>(null);
  // When skipEmailVerification is true (patient flow) treat email as pre-verified.
  const [emailVerified, setEmailVerified] = useState(skipEmailVerification);
  const [verifiedEmail, setVerifiedEmail] = useState(skipEmailVerification ? details.email.toLowerCase() : "");
  const [resendTimer,   setResendTimer]   = useState(0);

  // ── Welcome-back state (set after OTP verify when patient is found) ─────────
  const [welcomeBack, setWelcomeBack] = useState<WelcomeBackPatient | null>(null);

  // Ensure emailVerified stays in sync when skipEmailVerification prop is true.
  // (Defensive guard against any timing edge on first render in patient flow.)
  useEffect(() => {
    if (skipEmailVerification && !emailVerified) {
      setEmailVerified(true);
    }
    if (skipEmailVerification && !verifiedEmail && details.email) {
      setVerifiedEmail(details.email.toLowerCase());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipEmailVerification]);

  // Countdown tick
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Coupon state
  const [couponInput,   setCouponInput]   = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const [coupon,        setCoupon]        = useState<CouponResult | null>(null);

  const consultationFee = plan.price_paise;
  const discountPaise   = coupon?.discount_paise ?? 0;
  const total           = coupon?.final_paise ?? consultationFee;

  const dateLabel = new Date(scheduledDate).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const timeLabel = formatTime(scheduledTime);

  // ── Field helpers ──────────────────────────────────────────────────────────

  const set = (key: BookingField["key"], val: string) =>
    onChange({ ...details, [key]: val });

  function handleEmailChange(newEmail: string) {
    set("email", newEmail);
    // If the email changes away from the verified one, reset verification
    if (emailVerified && newEmail.trim().toLowerCase() !== verifiedEmail) {
      setEmailVerified(false);
      setVerifiedEmail("");
      setOtpSent(false);
      setOtpValue("");
      setOtpError(null);
      setResendTimer(0);
    } else if (otpSent && newEmail.trim().toLowerCase() !== details.email.trim().toLowerCase()) {
      // Email changed while OTP was pending — invalidate the pending OTP
      setOtpSent(false);
      setOtpValue("");
      setOtpError(null);
      setResendTimer(0);
    }
  }

  const visibleRequired = fields.filter((f) => f.visible && f.required);
  const canPay = !paying
    && visibleRequired.every((f) => {
      const val = details[f.key] ?? "";
      return val.trim().length >= (f.key === "phone" ? 7 : 2);
    })
    && details.phone.trim().length >= 7
    // In patient flow (skipEmailVerification) the user is already authenticated —
    // no OTP needed. In public flow, OTP verification is the gate.
    && (skipEmailVerification || emailVerified);

  // ── OTP: send ─────────────────────────────────────────────────────────────

  async function sendOtp() {
    const email = details.email.trim();
    if (!email.includes("@")) return;
    setOtpSending(true);
    setOtpError(null);
    try {
      const res  = await fetch("/api/otp/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOtpError(data.error || "Failed to send OTP. Please try again.");
      } else {
        setOtpSent(true);
        setOtpValue("");
        setResendTimer(60);
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpSending(false);
    }
  }

  // ── OTP: verify ───────────────────────────────────────────────────────────

  async function verifyOtpCode() {
    const email = details.email.trim();
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const res  = await fetch("/api/otp/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, otp: otpValue.trim() }),
      });
      const data = await res.json() as {
        verified: boolean;
        error?: string;
        patient?: WelcomeBackPatient | null;
      };
      if (!data.verified) {
        setOtpError(data.error || "Incorrect OTP. Please try again.");
      } else {
        setEmailVerified(true);
        setVerifiedEmail(email.toLowerCase());
        setOtpSent(false);
        setOtpValue("");
        setOtpError(null);

        // ── Seamless pre-fill when returning patient is found ──
        if (data.patient) {
          const p = data.patient;
          setWelcomeBack(p);
          onChange({
            ...details,
            full_name: p.full_name || details.full_name,
            phone:     p.phone     || details.phone,
            email:     email,
            age:       p.age    != null ? String(p.age) : details.age,
            gender:    p.gender ?? details.gender,
            city:      p.city   ?? details.city,
          });
        }
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  }

  // ── Coupon ────────────────────────────────────────────────────────────────

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    setCoupon(null);
    try {
      const res  = await fetch("/api/coupons/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, amount_paise: consultationFee }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error || "Invalid coupon.");
      } else {
        setCoupon(data as CouponResult);
        trackCouponApplied(code);
      }
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  // ── Pay ───────────────────────────────────────────────────────────────────

  const pay = async () => {
    if (!canPay) return;
    setPaying(true);
    setError(null);
    trackBeginCheckout(plan.title, plan.price_paise);
    try {
      // 1. Create booking — reuse if already created (e.g. after Razorpay cancel)
      let bookingId = bookingIdRef.current;
      if (!bookingId) {
        const res = await fetch("/api/bookings", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id:                 plan.id,
            scheduled_date:          scheduledDate,
            scheduled_time:          scheduledTime,
            reason_for_consultation: details.reason || undefined,
            patient: {
              full_name: details.full_name,
              age:       details.age ? parseInt(details.age, 10) : undefined,
              gender:    details.gender || undefined,
              phone:     details.phone,
              email:     details.email || undefined,
              city:      details.city || undefined,
            },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create booking. Please try again.");
        }
        const data = await res.json();
        bookingId = data.id as string;
        bookingIdRef.current = bookingId;
      }

      // 2. Load Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway (script blocked or offline).");

      // 3. Create Razorpay order (server validates coupon + applies discount)
      const orderRes = await fetch(`/api/bookings/${bookingId}/order`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ couponCode: coupon?.code ?? undefined }),
      });
      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}));
        throw new Error(`Order failed (${orderRes.status}): ${body.error || orderRes.statusText}`);
      }
      const { orderId, amount, currency, keyId } = await orderRes.json() as {
        orderId: string; amount: number; currency: string; keyId: string;
      };
      if (!keyId) throw new Error("Payment gateway key missing — contact support.");

      // 4. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key:         keyId,
          amount,
          currency,
          order_id:    orderId,
          name:        "Brams Mind Care",
          description: plan.title,
          prefill:     { name: details.full_name, contact: details.phone, email: details.email || undefined },
          theme:       { color: "#745475" },
          handler:     async (response: {
            razorpay_payment_id: string;
            razorpay_order_id:   string;
            razorpay_signature:  string;
          }) => {
            try {
              const verifyRes = await fetch(`/api/bookings/${bookingId}/payment`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  gateway_payment_id: response.razorpay_payment_id,
                  gateway_order_id:   response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) throw new Error("Payment verification failed. Please contact support.");
              trackPurchase(bookingId!, plan.title, plan.price_paise);
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("CANCELLED")) },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rzp.on("payment.failed", (res: any) => {
          trackPaymentFailed(plan.title);
          reject(new Error(res.error?.description || "Payment failed. Please try again."));
        });
        rzp.open();
      });

      // 5. Success redirect
      const params = new URLSearchParams({
        id:       bookingId!,
        plan:     plan.title,
        date:     scheduledDate,
        time:     scheduledTime,
        name:     details.full_name,
        duration: String(plan.duration_minutes),
      });
      router.push(`${successPath ?? "/book/success"}?${params.toString()}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "CANCELLED") { setPaying(false); return; }
      console.error("[pay] failed:", e);
      setError(msg);
      if (bookingIdRef.current) {
        const params = new URLSearchParams({ plan: plan.id, error: msg });
        router.push(`/book/failed?${params.toString()}`);
      }
    } finally {
      setPaying(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Welcome-back banner — shown when OTP reveals a returning patient */}
      {welcomeBack && (
        <div className={dStyles.welcomeBanner}>
          👋 Welcome back, <strong>{welcomeBack.full_name}</strong>! We&apos;ve filled in your details from your previous visit.
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Left: patient details form ── */}
        <div className={styles.card}>
          <div className={dStyles.fieldsGrid}>
            {fields.filter((f) => f.visible).map((f) => {
              // Email field gets a custom OTP-aware widget; always full-width
              if (f.key === "email") {
                return (
                  <div key={f.id} className={dStyles.colFull}>
                    <div className={dStyles.field}>
                      <span className={dStyles.label}>Email *</span>

                      {/* When OTP is skipped (patient flow) just show a plain input */}
                      {skipEmailVerification ? (
                        <input
                          className={dStyles.input}
                          type="email"
                          value={details.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder={f.placeholder || "name@example.com"}
                        />
                      ) : (
                        <>
                          {/* Email input row */}
                          <div className={dStyles.emailRow}>
                            <input
                              className={dStyles.input}
                              type="email"
                              value={details.email}
                              onChange={(e) => handleEmailChange(e.target.value)}
                              placeholder={f.placeholder || "name@example.com"}
                              disabled={emailVerified}
                              style={{ flex: 1 }}
                            />
                            {emailVerified ? (
                              <div className={dStyles.emailVerifiedActions}>
                                <span className={dStyles.verifiedBadge}>✓ Verified</span>
                                <button
                                  type="button"
                                  className={dStyles.changeEmailBtn}
                                  onClick={() => {
                                    setEmailVerified(false);
                                    setVerifiedEmail("");
                                    setOtpSent(false);
                                    setOtpValue("");
                                    setOtpError(null);
                                  }}
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={dStyles.sendOtpBtn}
                                onClick={sendOtp}
                                disabled={!details.email.includes("@") || otpSending || otpSent}
                              >
                                {otpSending ? "Sending…" : otpSent ? "Code sent" : "Send OTP"}
                              </button>
                            )}
                          </div>

                          {/* OTP entry — shown after code is sent */}
                          {otpSent && !emailVerified && (
                            <div className={dStyles.otpSection}>
                              <p className={dStyles.otpHint}>
                                Enter the 6-digit code sent to <strong>{details.email}</strong>
                              </p>
                              <div className={dStyles.otpRow}>
                                <input
                                  className={dStyles.otpInput}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  placeholder="000000"
                                  value={otpValue}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    setOtpValue(v);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && otpValue.length === 6) verifyOtpCode();
                                  }}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className={dStyles.verifyOtpBtn}
                                  onClick={verifyOtpCode}
                                  disabled={otpValue.length < 6 || otpVerifying}
                                >
                                  {otpVerifying ? "Verifying…" : "Verify"}
                                </button>
                              </div>

                              {resendTimer > 0 ? (
                                <p className={dStyles.resendNote}>
                                  Didn&apos;t receive it? Resend in {resendTimer}s
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  className={dStyles.resendBtn}
                                  onClick={sendOtp}
                                  disabled={otpSending}
                                >
                                  {otpSending ? "Sending…" : "Resend OTP"}
                                </button>
                              )}

                              {otpError && <p className={dStyles.otpError}>{otpError}</p>}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              // All other fields — generic render
              return (
                <div
                  key={f.id}
                  className={f.width === "full" ? dStyles.colFull : dStyles.colHalf}
                >
                  <label className={dStyles.field}>
                    <span className={dStyles.label}>
                      {f.label}{f.required ? " *" : ""}
                    </span>

                    {f.type === "select" ? (
                      <select
                        className={dStyles.input}
                        value={details[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "-")}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        className={dStyles.textarea}
                        value={details[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={4}
                      />
                    ) : (
                      <input
                        className={dStyles.input}
                        type={f.type}
                        value={details[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        min={f.type === "number" ? 1 : undefined}
                        max={f.type === "number" ? 120 : undefined}
                      />
                    )}
                  </label>
                </div>
              );
            })}
          </div>

          {error && <p className={dStyles.error}>{error}</p>}
        </div>

        {/* ── Right: payment summary card ── */}
        <div className={dStyles.payCard}>
          {/* Booking details */}
          <div className={dStyles.bookingDetails}>
            <div className={dStyles.planBadge}>{plan.title}</div>
            <div className={dStyles.detailGrid}>
              <div className={dStyles.detailItem}>
                <span className={dStyles.detailLabel}>Date</span>
                <span className={dStyles.detailValue}>{dateLabel}</span>
              </div>
              <div className={dStyles.detailItem}>
                <span className={dStyles.detailLabel}>Time</span>
                <span className={dStyles.detailValue}>{timeLabel}</span>
              </div>
              <div className={dStyles.detailItem}>
                <span className={dStyles.detailLabel}>Mode</span>
                <span className={dStyles.detailValue}>Online Video Call</span>
              </div>
            </div>
          </div>

          <div className={dStyles.divider} />

          {/* Payment rows */}
          <h3 className={dStyles.payHeading}>Payment Summary</h3>
          <PayRow label="Consultation Fee" value={formatINR(consultationFee)} />
          {discountPaise > 0 && (
            <PayRow
              label={`Discount (${coupon!.discount_type === "percent"
                ? `${coupon!.discount_value}%`
                : formatINR(coupon!.discount_value * 100)})`}
              value={`− ${formatINR(discountPaise)}`}
              discount
            />
          )}
          <div className={dStyles.divider} />
          <PayRow label="Total" value={formatINR(total)} strong />

          {/* Coupon input */}
          <div className={dStyles.couponSection}>
            {coupon ? (
              <div className={dStyles.couponApplied}>
                <span>🏷️ <strong>{coupon.code}</strong> applied</span>
                <button className={dStyles.couponRemove} onClick={removeCoupon}>Remove</button>
              </div>
            ) : (
              <div className={dStyles.couponRow}>
                <input
                  className={dStyles.couponInput}
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                  disabled={couponLoading}
                  maxLength={30}
                />
                <button
                  className={dStyles.couponApplyBtn}
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                >
                  {couponLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className={dStyles.couponError}>{couponError}</p>}
          </div>

          <div className={dStyles.secureBadge}>🔒 100% Secure &amp; Confidential</div>
        </div>
      </div>

      <StickyFooter
        onBack={onBack}
        backLabel="← Back"
        onNext={pay}
        nextLabel={`Pay ${formatINR(total)} →`}
        nextDisabled={!canPay}
        nextLoading={paying}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PayRow({
  label, value, strong, discount,
}: {
  label: string; value: string; strong?: boolean; discount?: boolean;
}) {
  return (
    <div className={`${strong ? dStyles.payRowStrong : dStyles.payRow} ${discount ? dStyles.payRowDiscount : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
