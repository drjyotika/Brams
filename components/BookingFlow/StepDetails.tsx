"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PatientDetails, PlanInfo } from "./index";
import type { BookingField } from "../../lib/content";
import { StickyFooter } from "./StickyFooter";
import styles from "./BookingFlow.module.scss";
import dStyles from "./StepDetails.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}: {
  plan: PlanInfo;
  scheduledDate: string;
  scheduledTime: string;
  fields: BookingField[];
  details: PatientDetails;
  onChange: (v: PatientDetails) => void;
  onBack: () => void;
}) {
  const router = useRouter();

  // Reuse existing booking on Razorpay cancel so we don't create duplicates
  const bookingIdRef = useRef<string | null>(null);

  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

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

  const set = (key: BookingField["key"], val: string) =>
    onChange({ ...details, [key]: val });

  const visibleRequired = fields.filter((f) => f.visible && f.required);
  const canPay = !paying && visibleRequired.every((f) => {
    const val = details[f.key] ?? "";
    return val.trim().length >= (f.key === "phone" ? 7 : 2);
  });

  // ─── Coupon ────────────────────────────────────────────────────────────────

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

  // ─── Pay ───────────────────────────────────────────────────────────────────

  const pay = async () => {
    if (!canPay) return;
    setPaying(true);
    setError(null);
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

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway (script blocked or offline).");

      // 3. Create Razorpay order (server-side coupon validation + discount applied)
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
          prefill:     {
            name:    details.full_name,
            contact: details.phone,
            email:   details.email || undefined,
          },
          theme:   { color: "#745475" },
          handler: async (response: {
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
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("CANCELLED")) },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rzp.on("payment.failed", (res: any) => {
          reject(new Error(res.error?.description || "Payment failed. Please try again."));
        });
        rzp.open();
      });

      // 5. Redirect to success
      const params = new URLSearchParams({
        id:   bookingId!,
        plan: plan.title,
        date: scheduledDate,
        time: scheduledTime,
        name: details.full_name,
      });
      router.push(`/book/success?${params.toString()}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "CANCELLED") {
        // User dismissed Razorpay — stay on page, booking already exists, let them retry
        setPaying(false);
        return;
      }
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className={styles.layout}>
        {/* Left: patient details form */}
        <div className={styles.card}>
          <div className={dStyles.fieldsGrid}>
            {fields.filter((f) => f.visible).map((f) => (
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
            ))}
          </div>
          {error && <p className={dStyles.error}>{error}</p>}
        </div>

        {/* Right: payment summary card */}
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
              <div className={dStyles.detailItem}>
                <span className={dStyles.detailLabel}>Duration</span>
                <span className={dStyles.detailValue}>{plan.duration_minutes} min</span>
              </div>
            </div>
          </div>

          <div className={dStyles.divider} />

          {/* Payment rows */}
          <h3 className={dStyles.payHeading}>Payment Summary</h3>
          <PayRow label="Consultation Fee" value={formatINR(consultationFee)} />
          {discountPaise > 0 && (
            <PayRow
              label={`Discount (${coupon!.discount_type === "percent" ? `${coupon!.discount_value}%` : formatINR(coupon!.discount_value * 100)})`}
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
