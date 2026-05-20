"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanInfo } from "./index";
import { StickyFooter } from "./StickyFooter";
import styles from "./BookingFlow.module.scss";
import cStyles from "./StepConfirm.module.scss";

type Upload = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
};

type CouponResult = {
  discount_paise: number;
  final_paise:    number;
  code:           string;
  discount_type:  "percent" | "fixed";
  discount_value: number;
};

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

export function StepConfirm({
  plan,
  bookingId,
  scheduledDate,
  scheduledTime,
  patientName,
  onBack,
}: {
  plan: PlanInfo;
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
  patientName: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads,  setUploads]  = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paying,   setPaying]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Coupon state
  const [couponInput,   setCouponInput]   = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const [coupon,        setCoupon]        = useState<CouponResult | null>(null);

  const consultationFee = plan.price_paise;
  const discountPaise   = coupon?.discount_paise ?? 0;
  const total           = (coupon?.final_paise ?? consultationFee);

  const dateLabel = new Date(scheduledDate).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  const timeLabel = formatTime(scheduledTime);

  // ─── Coupon apply ────────────────────────────────────────────────────────────

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

  // ─── File upload ─────────────────────────────────────────────────────────────

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/bookings/${bookingId}/uploads`, {
          method: "POST",
          body:   form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
        const data: Upload = await res.json();
        setUploads((u) => [...u, data]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Pay ─────────────────────────────────────────────────────────────────────

  const pay = async () => {
    setPaying(true);
    setError(null);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load payment gateway (script blocked or offline)");

      // Create Razorpay order — pass coupon code for server-side validation
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
      if (!keyId) throw new Error("Payment gateway key missing — contact support");

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key:         keyId,
          amount,
          currency,
          order_id:    orderId,
          name:        "Brams Mind Care",
          description: plan.title,
          prefill:     { name: patientName },
          theme:       { color: "#745475" },
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
              if (!verifyRes.ok) throw new Error("Payment verification failed. Contact support.");
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

      const params = new URLSearchParams({
        id:   bookingId,
        plan: plan.title,
        date: scheduledDate,
        time: scheduledTime,
        name: patientName,
      });
      router.push(`/book/success?${params.toString()}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "CANCELLED") { setPaying(false); return; }
      console.error("[pay] failed:", e);
      setError(msg);
      const params = new URLSearchParams({ plan: plan.id, error: msg });
      router.push(`/book/failed?${params.toString()}`);
    } finally {
      setPaying(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className={styles.layout}>
        {/* Left: booking details + upload */}
        <div className={cStyles.confirmCard}>
          <div className={cStyles.headerRow}>
            <div>
              <p className={cStyles.brandLine}>Brams Mind Care</p>
              <p className={cStyles.subLine}>Professional Psychiatric Consultation</p>
            </div>
            <span className={cStyles.consultationBadge}>{plan.title}</span>
          </div>

          <div className={cStyles.detailGrid}>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>For</span>
              <span className={cStyles.detailValue}>{patientName}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Date</span>
              <span className={cStyles.detailValue}>{dateLabel}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Time</span>
              <span className={cStyles.detailValue}>{timeLabel}</span>
            </div>
            <div className={cStyles.detail}>
              <span className={cStyles.detailLabel}>Mode</span>
              <span className={cStyles.detailValue}>Online Video Call</span>
            </div>
          </div>

          <div className={cStyles.uploadSection}>
            <h4>Upload reports (optional)</h4>
            <p className={cStyles.uploadHint}>PDF, JPG, or PNG &mdash; up to 10 MB each.</p>
            <input
              ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              multiple hidden onChange={(e) => handleUpload(e.target.files)}
            />
            <button type="button" className={cStyles.uploadBtn}
              onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "+ Choose Files"}
            </button>
            {uploads.length > 0 && (
              <ul className={cStyles.uploadList}>
                {uploads.map((u) => (
                  <li key={u.id}>
                    <a href={u.file_url} target="_blank" rel="noreferrer">{u.file_name}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cStyles.secureBadge}>🔒 100% Secure &amp; Confidential</div>
        </div>

        {/* Right: payment summary */}
        <div className={cStyles.payCard}>
          <h3 className={cStyles.payHeading}>Payment Summary</h3>

          <Row label="Consultation Fee" value={formatINR(consultationFee)} />

          {discountPaise > 0 && (
            <Row
              label={`Discount (${coupon!.discount_type === "percent" ? `${coupon!.discount_value}%` : formatINR(coupon!.discount_value)})`}
              value={`− ${formatINR(discountPaise)}`}
              discount
            />
          )}

          <div className={cStyles.divider} />
          <Row label="Total" value={formatINR(total)} strong />

          {/* Coupon input */}
          <div className={cStyles.couponSection}>
            {coupon ? (
              <div className={cStyles.couponApplied}>
                <span>🏷️ <strong>{coupon.code}</strong> applied</span>
                <button className={cStyles.couponRemove} onClick={removeCoupon}>Remove</button>
              </div>
            ) : (
              <div className={cStyles.couponRow}>
                <input
                  className={cStyles.couponInput}
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                  disabled={couponLoading}
                  maxLength={30}
                />
                <button
                  className={cStyles.couponApplyBtn}
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                >
                  {couponLoading ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className={cStyles.couponError}>{couponError}</p>}
          </div>

          {error && <p className={cStyles.error}>{error}</p>}
        </div>
      </div>

      <StickyFooter
        onBack={onBack}
        backLabel="← Back to details"
        onNext={pay}
        nextLabel={`Pay ${formatINR(total)} →`}
        nextLoading={paying}
      />
    </div>
  );
}

function Row({
  label, value, strong, discount,
}: {
  label: string; value: string; strong?: boolean; discount?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0",
      fontSize:   strong ? 17 : 14,
      fontWeight: strong ? 700 : 400,
      fontFamily: strong ? "var(--font-display)" : undefined,
      color:      strong ? "#1e1b24" : "#6b7280",
    }}>
      <span style={{ color: discount ? "#16a34a" : undefined }}>{label}</span>
      <span style={{
        color:      discount ? "#16a34a" : strong ? "#745475" : "#1e1b24",
        fontWeight: 600,
      }}>{value}</span>
    </div>
  );
}

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
