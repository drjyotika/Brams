"use client";

/**
 * Patient-authenticated full-page booking flow.
 * Steps:
 *   1 — Plan selection
 *   2 — Date + time
 *   3 — Confirm (patient details pre-filled from session)
 *   4 — Success
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DaySchedule } from "../../../lib/content";
import { defaultContent } from "../../../lib/content";
import { BramsLoader } from "../../../components/BramsLoader";
import styles from "./book.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  title: string;
  eyebrow?: string;
  price: string;
  unit?: string;
  price_paise: number;
  duration_minutes: number;
};

type PatientInfo = {
  id:        string;
  full_name: string;
  phone:     string;
  email:     string | null;
  age:       number | null;
  gender:    string | null;
  city:      string | null;
};

type Step = 1 | 2 | 3 | 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isDayAvailable(schedule: DaySchedule[], date: Date) {
  const ds = schedule.find(s => s.day === date.getDay());
  return !!(ds?.enabled && ds.slots.length > 0);
}

function fmt12(time: string) {
  const [hStr, m] = time.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Step header ──────────────────────────────────────────────────────────────

const STEP_META: Record<Exclude<Step, 4>, { title: string; subtitle: string }> = {
  1: { title: "Choose a Plan",         subtitle: "Pick a consultation plan that fits your needs." },
  2: { title: "Choose Date & Time",    subtitle: "Find a slot that works for you. All sessions are conducted via a secure video platform." },
  3: { title: "Review & Confirm",      subtitle: "Confirm your booking details. Your profile information is pre-filled." },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientBookingFlow() {
  const router = useRouter();

  // Page state
  const [step, setStep] = useState<Step>(1);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Plan + schedule
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultContent.bookingStep1.schedule);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Step 2 — date & time
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 3 — reason
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState("");

  // Load patient + plans + schedule
  useEffect(() => {
    fetch("/api/patient/me")
      .then(async (r) => {
        if (r.status === 401) { router.replace("/patient/login"); return null; }
        if (!r.ok) return null;
        return r.json().catch(() => null);
      })
      .then((data) => { if (data?.patient) setPatient(data.patient); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));

    Promise.all([
      fetch("/api/plans").then(r => r.json()),
      fetch("/api/booking-config").then(r => r.json()),
    ])
      .then(([p, cfg]) => {
        setPlans(Array.isArray(p) ? p : []);
        if (cfg?.step1?.schedule) setSchedule(cfg.step1.schedule);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, [router]);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const ds = schedule.find(s => s.day === new Date(y, mo - 1, d).getDay());
    return ds?.enabled ? (ds.slots ?? []) : [];
  }, [selectedDate, schedule]);

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  async function confirmBooking() {
    if (!patient || !selectedPlan || !selectedDate || !selectedTime) return;
    setBooking(true);
    setBookingErr("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id:                 selectedPlan.id,
          scheduled_date:          selectedDate,
          scheduled_time:          selectedTime,
          reason_for_consultation: reason || undefined,
          patient: {
            full_name: patient.full_name,
            phone:     patient.phone,
            email:     patient.email ?? undefined,
            age:       patient.age ?? undefined,
            gender:    patient.gender ?? undefined,
            city:      patient.city ?? undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Booking failed. Please try again.");
      }
      setStep(4);
    } catch (e) {
      setBookingErr((e as Error).message);
    } finally {
      setBooking(false);
    }
  }

  // ── Loading / unauthenticated ──
  if (authLoading || plansLoading) return <BramsLoader fullPage />;
  if (!patient) return null;

  // ── Success step ──
  if (step === 4) {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>🎉</div>
            <h1 className={styles.successTitle}>Booking Confirmed!</h1>
            <p className={styles.successText}>
              Your appointment has been booked. You&apos;ll receive a confirmation shortly.
            </p>
            <div className={styles.successDetails}>
              <div><span>Plan</span><strong>{selectedPlan?.title}</strong></div>
              <div><span>Date</span><strong>{selectedDate && fmtDate(selectedDate)}</strong></div>
              <div><span>Time</span><strong>{selectedTime && fmt12(selectedTime.slice(0,5))}</strong></div>
            </div>
            <Link href="/patient" className={styles.primaryCta}>Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Render ──
  const meta = STEP_META[step as 1 | 2 | 3];

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
            {[1, 2, 3].map(i => (
              <span key={i} className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ""}`} />
            ))}
          </div>
        </div>

        {/* ── Step 1: Plan selection ── */}
        {step === 1 && (
          <div className={styles.card}>
            {plans.length === 0 ? (
              <p className={styles.empty}>No plans available right now.</p>
            ) : (
              <div className={styles.planGrid}>
                {plans.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlan(p); setStep(2); }}
                    className={styles.planCard}
                  >
                    {p.eyebrow && <div className={styles.planEyebrow}>{p.eyebrow}</div>}
                    <div className={styles.planTitle}>{p.title}</div>
                    <div className={styles.planPrice}>{p.price}</div>
                    {p.unit && <div className={styles.planUnit}>{p.unit}</div>}
                    <div className={styles.planDuration}>{p.duration_minutes} min session</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Date & time ── */}
        {step === 2 && selectedPlan && (
          <>
            <div className={styles.layoutEqual}>
              {/* Calendar */}
              <div className={styles.card}>
                <div className={styles.calHead}>
                  <span className={styles.monthLabel}>{monthLabel}</span>
                  <span className={styles.calNav}>
                    {([["‹", -1], ["›", 1]] as const).map(([label, dir]) => (
                      <button key={label} type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + dir, 1))} className={styles.calNavBtn}>
                        {label}
                      </button>
                    ))}
                  </span>
                </div>
                <div className={styles.calWeekRow}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <span key={i} className={styles.calWeekDay}>{d}</span>
                  ))}
                </div>
                <div className={styles.calGrid}>
                  {days.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const iso = isoDate(d);
                    const isPast = d < today;
                    const isAvail = isDayAvailable(schedule, d);
                    const isActive = iso === selectedDate;
                    return (
                      <button key={i} type="button" disabled={isPast || !isAvail}
                        onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                        className={`${styles.calDay} ${isActive ? styles.calDayActive : ""} ${isPast || !isAvail ? styles.calDayDisabled : ""}`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Available Slots</div>
                {!selectedDate ? (
                  <p className={styles.helper}>Pick a date to see slots.</p>
                ) : slotsForDate.length === 0 ? (
                  <p className={styles.helper}>No slots available on this day.</p>
                ) : (
                  <div className={styles.slotList}>
                    {slotsForDate.map(slot => {
                      const value = `${slot.time}:00`;
                      const isActive = selectedTime === value;
                      return (
                        <button key={slot.id} type="button" onClick={() => setSelectedTime(value)}
                          className={`${styles.slotBtn} ${isActive ? styles.slotBtnActive : ""}`}>
                          <span>{fmt12(slot.time)}</span>
                          <span className={styles.slotMeta}>{selectedPlan.duration_minutes} min</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button type="button" className={styles.primaryCta} disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && selectedPlan && selectedDate && selectedTime && (
          <>
            <div className={styles.layoutEqual}>
              {/* Reason */}
              <div className={styles.card}>
                <label className={styles.label} htmlFor="reason">
                  Reason for consultation <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={5}
                  placeholder="Briefly describe what brings you in today. This helps Dr. Jyotika prepare for your session."
                  className={styles.textarea}
                />
                {bookingErr && <p className={styles.error}>{bookingErr}</p>}
              </div>

              {/* Summary */}
              <div className={styles.summary}>
                <h3 className={styles.summaryTitle}>Booking Summary</h3>
                <div className={styles.summaryRow}><span>Plan</span><strong>{selectedPlan.title}</strong></div>
                <div className={styles.summaryRow}><span>Date</span><strong>{fmtDate(selectedDate)}</strong></div>
                <div className={styles.summaryRow}><span>Time</span><strong>{fmt12(selectedTime.slice(0,5))}</strong></div>
                <div className={styles.summaryRow}><span>Duration</span><strong>{selectedPlan.duration_minutes} min</strong></div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryRow}><span>Name</span><strong>{patient.full_name}</strong></div>
                <div className={styles.summaryRow}><span>Phone</span><strong>{patient.phone}</strong></div>
                {patient.email && <div className={styles.summaryRow}><span>Email</span><strong>{patient.email}</strong></div>}
                <div className={styles.summaryDivider} />
                <div className={styles.summaryTotal}>
                  <span>Total</span>
                  <strong>₹{(selectedPlan.price_paise / 100).toLocaleString("en-IN")}</strong>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button type="button" className={styles.primaryCta} disabled={booking} onClick={confirmBooking}>
                {booking ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
