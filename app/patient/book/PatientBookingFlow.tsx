"use client";

/**
 * Patient-authenticated booking flow — 3 active steps.
 *   Step 1 — Plan selection (homepage-style cards with features)
 *   Step 2 — Date & time picker   (mirrors public flow step 1)
 *   Step 3 — Details + Payment     (mirrors public flow step 2, OTP skipped)
 *   "success" — redirected to /book/success by StepDetails after payment
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DaySchedule, PricingPlan, BookingStep2Data } from "../../../lib/content";
import { defaultContent } from "../../../lib/content";

// Client-side helpers (mirrors lib/plans.ts server functions)
function parsePriceToPaise(price: string): number {
  const cleaned = price.replace(/[^\d.]/g, "");
  const rupees = parseFloat(cleaned);
  if (Number.isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}
function parseDurationMinutes(unit: string): number {
  const match = unit.match(/(\d+)\s*(?:[–-]\s*(\d+))?\s*min/i);
  if (!match) return 30;
  return parseInt(match[2] ?? match[1], 10);
}
import { BramsLoader } from "../../../components/BramsLoader";
import { StepDateTime } from "../../../components/BookingFlow/StepDateTime";
import { StepDetails } from "../../../components/BookingFlow/StepDetails";
import type { PlanInfo, PatientDetails } from "../../../components/BookingFlow/index";
import { Icon } from "../../../components/Icon";
import styles from "./book.module.scss";
import planStyles from "./PatientPlanCard.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientInfo = {
  id:        string;
  full_name: string;
  phone:     string;
  email:     string | null;
  age:       number | null;
  gender:    string | null;
  city:      string | null;
};

type Step = 1 | 2 | 3;

// ─── Step header meta ─────────────────────────────────────────────────────────

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  1: {
    title:    "Choose a Plan",
    subtitle: "Pick a consultation plan that fits your needs.",
  },
  2: {
    title:    "Select Date & Time",
    subtitle: "Choose a slot that works for you.",
  },
  3: {
    title:    "Your Details & Payment",
    subtitle: "Review your details and complete payment to confirm your booking.",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientBookingFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const presetPlanId = search.get("plan"); // e.g. a returning patient booking a follow-up

  const [step, setStep]       = useState<Step>(1);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Plans (full PricingPlan with features)
  const [plans, setPlans]               = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Schedule (from booking config)
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultContent.bookingStep1.schedule);

  // Booking form fields (from booking config step 2)
  const [step2Config, setStep2Config] = useState<BookingStep2Data>(defaultContent.bookingStep2);

  // Selected plan (converted to PlanInfo shape for StepDetails)
  const [selectedPlanRaw, setSelectedPlanRaw] = useState<PricingPlan | null>(null);

  // Step 2 — date & time. Pre-select today so the calendar is never blank on
  // arrival (mirrors the public /book flow).
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 3 — patient details (pre-filled from profile)
  const [details, setDetails] = useState<PatientDetails>({
    full_name: "",
    age:       "",
    gender:    "",
    phone:     "",
    email:     "",
    city:      "",
    reason:    "",
  });

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Auth check
    fetch("/api/patient/me")
      .then(async (r) => {
        if (r.status === 401) { router.replace("/patient/login"); return null; }
        if (!r.ok) return null;
        return r.json().catch(() => null);
      })
      .then((data) => {
        if (data?.patient) {
          const p: PatientInfo = data.patient;
          setPatient(p);
          // Pre-fill details from patient profile
          setDetails({
            full_name: p.full_name ?? "",
            age:       p.age != null ? String(p.age) : "",
            gender:    p.gender ?? "",
            phone:     p.phone ?? "",
            email:     p.email ?? "",
            city:      p.city ?? "",
            reason:    "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));

    // Plans + booking config
    Promise.all([
      fetch("/api/plans").then(r => r.json()),
      fetch("/api/booking-config").then(r => r.json()),
    ])
      .then(([p, cfg]) => {
        setPlans(Array.isArray(p) ? p : []);
        if (cfg?.step1?.schedule) setSchedule(cfg.step1.schedule);
        if (cfg?.step2) setStep2Config(cfg.step2);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, [router]);

  // Preselect a plan passed via ?plan= (e.g. a returning patient routed here to
  // book a follow-up) and jump straight to the date picker.
  useEffect(() => {
    if (!presetPlanId || plansLoading || plans.length === 0 || selectedPlanRaw) return;
    const match = plans.find((p) => p.id === presetPlanId);
    if (match) {
      setSelectedPlanRaw(match);
      setStep(2);
    }
  }, [presetPlanId, plansLoading, plans, selectedPlanRaw]);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ── Derived plan shape for StepDetails ────────────────────────────────────

  const selectedPlan: PlanInfo | null = selectedPlanRaw
    ? {
        id:               selectedPlanRaw.id,
        title:            selectedPlanRaw.title,
        eyebrow:          selectedPlanRaw.eyebrow ?? "",
        price:            selectedPlanRaw.price,
        unit:             selectedPlanRaw.unit ?? "",
        price_paise:      parsePriceToPaise(selectedPlanRaw.price),
        duration_minutes: parseDurationMinutes(selectedPlanRaw.unit ?? ""),
      }
    : null;

  // ── Loading / auth ────────────────────────────────────────────────────────

  if (authLoading || plansLoading) return <BramsLoader fullPage />;
  if (!patient) return null;

  // ── Active step header ────────────────────────────────────────────────────

  const meta = STEP_META[step];

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {/* Step header */}
        <div className={styles.stepHeader}>
          <div>
            <span className={styles.stepEyebrow}>Step {step} of 3</span>
            <h1 className={styles.stepTitle}>{meta.title}</h1>
            <p className={styles.stepSubtitle}>{meta.subtitle}</p>
          </div>
          <div className={styles.progress}>
            {([1, 2, 3] as Step[]).map(i => (
              <span
                key={i}
                className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ""}`}
              />
            ))}
          </div>
        </div>

        {/* ── Step 1: Plan selection ── */}
        {step === 1 && (
          <div className={planStyles.planGrid}>
            {plans.length === 0 ? (
              <p className={styles.empty}>No plans available right now.</p>
            ) : (
              plans.map(p => (
                <PatientPlanCard
                  key={p.id}
                  plan={p}
                  onSelect={() => {
                    setSelectedPlanRaw(p);
                    setStep(2);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ── Step 2: Date & time (reuse public flow StepDateTime) ── */}
        {step === 2 && selectedPlan && (
          <StepDateTime
            plan={selectedPlan}
            schedule={schedule}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelect={(date, time) => {
              setSelectedDate(date);
              setSelectedTime(time || null);
            }}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {/* ── Step 3: Details + Payment (reuse public flow StepDetails, OTP skipped) ── */}
        {step === 3 && selectedPlan && selectedDate && selectedTime && (
          <StepDetails
            plan={selectedPlan}
            scheduledDate={selectedDate}
            scheduledTime={selectedTime}
            fields={step2Config.fields}
            details={details}
            onChange={setDetails}
            onBack={() => setStep(2)}
            skipEmailVerification={true}
            successPath="/book/success"
          />
        )}
      </main>
    </div>
  );
}

// ─── Homepage-style plan card ─────────────────────────────────────────────────

function PatientPlanCard({ plan, onSelect }: { plan: PricingPlan; onSelect: () => void }) {
  const featured = plan.highlighted ?? false;
  return (
    <article
      className={`${planStyles.plan} ${featured ? planStyles.planFeatured : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-label={`Select ${plan.title}`}
    >
      {plan.badge && <span className={planStyles.badge}>{plan.badge}</span>}
      <span className={planStyles.eyebrow}>{plan.eyebrow}</span>
      <h3 className={planStyles.planTitle}>{plan.title}</h3>
      <div className={planStyles.priceRow}>
        <span className={planStyles.price}>{plan.price}</span>
        <span className={planStyles.unit}>{plan.unit}</span>
      </div>
      {plan.features && plan.features.length > 0 && (
        <ul className={planStyles.features}>
          {plan.features.map((f, i) => (
            <li key={i} className={planStyles.feature}>
              <span className={planStyles.featureIcon}>
                <Icon name="check" size={14} strokeWidth={2.4} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={planStyles.selectBtn}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        tabIndex={-1}
      >
        {plan.cta?.label ?? "Book Now"}
      </button>
    </article>
  );
}
