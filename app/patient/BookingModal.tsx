"use client";

/**
 * Self-contained booking modal for the patient dashboard.
 * Does NOT use StickyFooter (portal to body) — all nav buttons are inline.
 *
 * Steps:
 *   0 — Plan selection
 *   1 — Date + time
 *   2 — Patient details (pre-filled from session)
 *   3 — Confirm & book
 *   4 — Success
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DaySchedule } from "../../lib/content";
import { defaultContent } from "../../lib/content";

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
  full_name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
};

type Details = {
  full_name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  city: string;
  reason: string;
};

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
  const ds = schedule.find((s) => s.day === date.getDay());
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalFooter({ onBack, onNext, nextLabel, nextDisabled, loading }: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", borderTop: "1px solid rgba(207,195,204,.25)",
      background: "#fff", gap: 12, flexShrink: 0,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          background: "none", border: "1px solid rgba(207,195,204,.5)",
          borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
          color: "#4c444b", cursor: "pointer",
        }}>← Back</button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        style={{
          background: nextDisabled || loading ? "#c4b5c4" : "#745475",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "10px 24px", fontSize: 13, fontWeight: 700,
          cursor: nextDisabled || loading ? "not-allowed" : "pointer",
          transition: "background 120ms",
        }}
      >
        {loading ? "Please wait…" : nextLabel}
      </button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function BookingModal({ patient, onClose, onBooked }: {
  patient: PatientInfo;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultContent.bookingStep1.schedule);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Step 1 state
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  // Step 2 state
  const [details, setDetails] = useState<Details>({
    full_name: patient.full_name,
    phone:     patient.phone,
    email:     patient.email ?? "",
    age:       patient.age?.toString() ?? "",
    gender:    patient.gender ?? "",
    city:      patient.city ?? "",
    reason:    "",
  });
  const [detailsErr, setDetailsErr] = useState("");

  // Step 3 state
  const [booking, setBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/plans").then(r => r.json()),
      fetch("/api/booking-config").then(r => r.json()),
    ]).then(([p, cfg]) => {
      setPlans(Array.isArray(p) ? p : []);
      if (cfg?.step1?.schedule) setSchedule(cfg.step1.schedule);
    }).catch(() => {}).finally(() => setPlansLoading(false));
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const ds = schedule.find(s => s.day === new Date(y, mo - 1, d).getDay());
    return ds?.enabled ? (ds.slots ?? []) : [];
  }, [selectedDate, schedule]);

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  async function confirmBooking() {
    if (!selectedPlan || !selectedDate || !selectedTime) return;
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
          reason_for_consultation: details.reason || undefined,
          patient: {
            full_name: details.full_name,
            phone:     details.phone,
            email:     details.email || undefined,
            age:       details.age ? parseInt(details.age, 10) : undefined,
            gender:    details.gender || undefined,
            city:      details.city || undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Booking failed. Please try again.");
      }
      setStep(4);
      onBooked(); // refresh parent appointment list
    } catch (e) {
      setBookingErr((e as Error).message);
    } finally {
      setBooking(false);
    }
  }

  if (!mounted) return null;

  const content = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(30,27,36,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid rgba(207,195,204,.25)", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              {step === 0 ? "Choose a plan" : step === 1 ? `${selectedPlan?.title} · Step 1 of 3` : step === 2 ? `${selectedPlan?.title} · Step 2 of 3` : step === 3 ? `${selectedPlan?.title} · Step 3 of 3` : ""}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b24" }}>
              {step === 0 ? "Book a Consultation" : step === 1 ? "Pick a Date & Time" : step === 2 ? "Your Details" : step === 3 ? "Review & Confirm" : "Booking Confirmed"}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, color: "#9b8fa0",
            cursor: "pointer", lineHeight: 1, padding: 4,
          }} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Step 0: Plan selection ── */}
          {step === 0 && (
            plansLoading ? (
              <p style={{ textAlign: "center", color: "#9b8fa0", padding: "40px 0" }}>Loading plans…</p>
            ) : plans.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9b8fa0", padding: "40px 0" }}>No plans available.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlan(p); setStep(1); }}
                    style={{
                      textAlign: "left", background: "#faf9fb",
                      border: "1.5px solid rgba(207,195,204,.4)",
                      borderRadius: 12, padding: "18px 20px", cursor: "pointer",
                      transition: "border-color 120ms, box-shadow 120ms",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#745475"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(207,195,204,.4)"; }}
                  >
                    {p.eyebrow && <div style={{ fontSize: 10, fontWeight: 700, color: "#745475", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{p.eyebrow}</div>}
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b24", marginBottom: 8 }}>{p.title}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#745475" }}>{p.price}</div>
                    {p.unit && <div style={{ fontSize: 11, color: "#9b8fa0" }}>{p.unit}</div>}
                    <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>{p.duration_minutes} min session</div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── Step 1: Date & time ── */}
          {step === 1 && selectedPlan && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Calendar */}
              <div style={{ border: "1px solid rgba(207,195,204,.35)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1e1b24" }}>{monthLabel}</span>
                  <span style={{ display: "flex", gap: 4 }}>
                    {[["‹", -1], ["›", 1]].map(([label, dir]) => (
                      <button key={String(label)} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + Number(dir), 1))}
                        style={{ background: "none", border: "1px solid rgba(207,195,204,.4)", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#4c444b" }}>
                        {label}
                      </button>
                    ))}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <span key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9b8fa0", padding: "4px 0" }}>{d}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                  {days.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const iso = isoDate(d);
                    const isPast = d < today;
                    const isAvail = isDayAvailable(schedule, d);
                    const isActive = iso === selectedDate;
                    return (
                      <button key={i} disabled={isPast || !isAvail}
                        onClick={() => { setSelectedDate(iso); setSelectedTime(null); setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50); }}
                        style={{
                          width: "100%", aspectRatio: "1", border: "none", borderRadius: 6,
                          fontSize: 12, fontWeight: isActive ? 700 : 500,
                          background: isActive ? "#745475" : "transparent",
                          color: isActive ? "#fff" : isPast || !isAvail ? "#d1c7d0" : "#1e1b24",
                          cursor: isPast || !isAvail ? "default" : "pointer",
                        }}
                      >{d.getDate()}</button>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div ref={slotsRef} style={{ border: "1px solid rgba(207,195,204,.35)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1e1b24", marginBottom: 8 }}>Available Slots</div>
                {!selectedDate ? (
                  <p style={{ fontSize: 13, color: "#9b8fa0" }}>Pick a date to see slots.</p>
                ) : slotsForDate.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9b8fa0" }}>No slots available on this day.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {slotsForDate.map((slot) => {
                      const value = `${slot.time}:00`;
                      const isActive = selectedTime === value;
                      return (
                        <button key={slot.id} onClick={() => setSelectedTime(value)}
                          style={{
                            padding: "10px 14px", border: "1.5px solid",
                            borderColor: isActive ? "#745475" : "rgba(207,195,204,.4)",
                            borderRadius: 8, background: isActive ? "#f5f0f5" : "#faf9fb",
                            cursor: "pointer", textAlign: "left",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: isActive ? "#745475" : "#1e1b24" }}>{fmt12(slot.time)}</span>
                          <span style={{ fontSize: 11, color: "#9b8fa0" }}>{selectedPlan.duration_minutes} min</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Patient details ── */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0, marginBottom: 16 }}>
                Your details are pre-filled from your profile. Update them if needed.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Full name *", key: "full_name", type: "text" },
                  { label: "Phone *",     key: "phone",     type: "tel" },
                  { label: "Email",       key: "email",     type: "email" },
                  { label: "Age",         key: "age",       type: "number" },
                  { label: "City",        key: "city",      type: "text" },
                ].map(({ label, key, type }) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
                    <input
                      type={type}
                      value={details[key as keyof Details]}
                      onChange={e => setDetails(d => ({ ...d, [key]: e.target.value }))}
                      style={{
                        padding: "10px 12px", border: "1px solid rgba(207,195,204,.4)",
                        borderRadius: 8, fontSize: 14, color: "#1e1b24", background: "#faf9fb", outline: "none",
                      }}
                    />
                  </label>
                ))}
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", textTransform: "uppercase", letterSpacing: 0.4 }}>Gender</span>
                  <select value={details.gender} onChange={e => setDetails(d => ({ ...d, gender: e.target.value }))}
                    style={{ padding: "10px 12px", border: "1px solid rgba(207,195,204,.4)", borderRadius: 8, fontSize: 14, color: "#1e1b24", background: "#faf9fb", outline: "none" }}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", textTransform: "uppercase", letterSpacing: 0.4 }}>Reason for consultation</span>
                  <textarea
                    value={details.reason}
                    onChange={e => setDetails(d => ({ ...d, reason: e.target.value }))}
                    rows={3}
                    placeholder="Briefly describe your concerns (optional)"
                    style={{
                      padding: "10px 12px", border: "1px solid rgba(207,195,204,.4)",
                      borderRadius: 8, fontSize: 14, color: "#1e1b24", background: "#faf9fb",
                      outline: "none", resize: "vertical", fontFamily: "inherit",
                    }}
                  />
                </label>
              </div>
              {detailsErr && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{detailsErr}</p>}
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && selectedPlan && selectedDate && selectedTime && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#faf9fb", border: "1px solid rgba(207,195,204,.35)", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e1b24", marginBottom: 14 }}>Booking Summary</div>
                {[
                  ["Plan",    selectedPlan.title],
                  ["Date",    fmtDate(selectedDate)],
                  ["Time",    fmt12(selectedTime.slice(0,5))],
                  ["Duration",`${selectedPlan.duration_minutes} min`],
                  ["Name",    details.full_name],
                  ["Phone",   details.phone],
                  ...(details.email ? [["Email", details.email]] : []),
                  ...(details.reason ? [["Reason", details.reason]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed rgba(207,195,204,.3)", fontSize: 13 }}>
                    <span style={{ color: "#6b7280", fontWeight: 600 }}>{k}</span>
                    <span style={{ color: "#1e1b24", textAlign: "right", maxWidth: "60%" }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 16, fontWeight: 800 }}>
                  <span style={{ color: "#1e1b24" }}>Total</span>
                  <span style={{ color: "#745475" }}>₹{(selectedPlan.price_paise / 100).toLocaleString("en-IN")}</span>
                </div>
              </div>
              {bookingErr && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{bookingErr}</p>}
            </div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#1e1b24", marginBottom: 8 }}>Booking Confirmed!</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px" }}>
                Your appointment has been booked. You&apos;ll receive a confirmation shortly.
              </p>
              <button onClick={onClose} style={{
                background: "#745475", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Back to Dashboard</button>
            </div>
          )}

        </div>

        {/* Footer nav */}
        {step === 1 && (
          <ModalFooter
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextLabel="Continue →"
            nextDisabled={!selectedDate || !selectedTime}
          />
        )}
        {step === 2 && (
          <ModalFooter
            onBack={() => setStep(1)}
            onNext={() => {
              if (!details.full_name.trim() || !details.phone.trim()) {
                setDetailsErr("Name and phone are required."); return;
              }
              setDetailsErr("");
              setStep(3);
            }}
            nextLabel="Review Booking →"
          />
        )}
        {step === 3 && (
          <ModalFooter
            onBack={() => setStep(2)}
            onNext={confirmBooking}
            nextLabel="Confirm & Book"
            loading={booking}
          />
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
