"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DaySchedule } from "../../../../lib/content";
import { defaultContent } from "../../../../lib/content";
import { BramsLoader } from "../../../../components/BramsLoader";
import { trackReschedule } from "../../../../lib/analytics";
import styles from "../../book/book.module.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  id:               string;
  plan_title:       string;
  scheduled_date:   string;
  scheduled_time:   string;
  duration_minutes: number;
  status:           string;
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
  const ds = schedule.find(s => s.day === date.getDay());
  return !!(ds?.enabled && ds.slots.length > 0);
}

// "10:30" → 630 (minutes since midnight)
function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Current date + minutes in IST (the clinic's timezone).
function istNowParts(): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
  };
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
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientRescheduleFlow({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();

  const [appointment,  setAppointment]  = useState<Appointment | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState("");
  const [schedule,     setSchedule]     = useState<DaySchedule[]>(defaultContent.bookingStep1.schedule);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [viewMonth,    setViewMonth]    = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes,  setBookedTimes]  = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);

  // Load appointment + schedule
  useEffect(() => {
    Promise.all([
      fetch("/api/patient/me").then(async (r) => {
        if (r.status === 401) { router.replace("/patient/login"); return null; }
        return r.ok ? r.json() : null;
      }),
      fetch("/api/booking-config").then(r => r.ok ? r.json() : null),
    ])
      .then(([me, cfg]) => {
        if (!me) return;
        const appt = (me.appointments as Appointment[] | undefined)?.find(a => a.id === appointmentId);
        if (!appt) { setLoadError("Appointment not found."); return; }
        if (["cancelled", "completed", "no_show"].includes(appt.status)) {
          setLoadError("This appointment cannot be rescheduled.");
          return;
        }
        setAppointment(appt);
        if (cfg?.step1?.schedule) setSchedule(cfg.step1.schedule);
      })
      .catch(() => setLoadError("Failed to load appointment."))
      .finally(() => setLoading(false));
  }, [appointmentId, router]);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [done]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  // Fetch already-booked times for the selected date so they can be hidden.
  useEffect(() => {
    if (!selectedDate) { setBookedTimes(new Set()); return; }
    let cancelled = false;
    fetch(`/api/availability?date=${selectedDate}`)
      .then(r => (r.ok ? r.json() : { booked: [] }))
      .then((d: { booked?: string[] }) => {
        if (!cancelled) setBookedTimes(new Set(d.booked ?? []));
      })
      .catch(() => { if (!cancelled) setBookedTimes(new Set()); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // All weekday slots. Past/booked slots are shown disabled (greyed), not hidden.
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const ds = schedule.find(s => s.day === new Date(y, mo - 1, d).getDay());
    return ds?.enabled ? (ds.slots ?? []) : [];
  }, [selectedDate, schedule]);

  // For marking which slots are unavailable.
  const istNow = istNowParts();
  const isTodaySelected = !!selectedDate && selectedDate === istNow.dateStr;
  const ownTime = appointment && selectedDate === appointment.scheduled_date.slice(0, 10)
    ? appointment.scheduled_time
    : null;

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  async function handleConfirm() {
    if (!appointment || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/patient/appointments/${appointment.id}/reschedule`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scheduled_date: selectedDate, scheduled_time: selectedTime }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to reschedule.");
      }
      trackReschedule();
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <BramsLoader fullPage />;

  if (loadError || !appointment) {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.successCard}>
            <h1 className={styles.successTitle}>Cannot reschedule</h1>
            <p className={styles.successText}>{loadError || "Appointment not found."}</p>
            <Link href="/patient" className={styles.primaryCta}>Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✅</div>
            <h1 className={styles.successTitle}>Reschedule Confirmed!</h1>
            <p className={styles.successText}>
              Our team will confirm your new slot shortly.
            </p>
            <div className={styles.successDetails}>
              <div><span>Plan</span><strong>{appointment.plan_title}</strong></div>
              <div><span>New Date</span><strong>{selectedDate && fmtDate(selectedDate)}</strong></div>
              <div><span>New Time</span><strong>{selectedTime && fmt12(selectedTime.slice(0,5))}</strong></div>
            </div>
            <Link href="/patient" className={styles.primaryCta}>Back to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {/* Step header */}
        <div className={styles.stepHeader}>
          <div>
            <span className={styles.stepEyebrow}>{appointment.plan_title}</span>
            <h1 className={styles.stepTitle}>Reschedule Appointment</h1>
            <p className={styles.stepSubtitle}>Pick a new date and time. Your existing slot will be released.</p>
          </div>
        </div>

        {/* Current appointment */}
        <div className={styles.currentBox}>
          <strong>Currently scheduled:</strong>{" "}
          {fmtDate(appointment.scheduled_date)} at {fmt12(appointment.scheduled_time.slice(0,5))} · {appointment.duration_minutes} min
        </div>

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
                const iso     = isoDate(d);
                const isPast  = d < today;
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
                  const value      = `${slot.time}:00`;
                  const isActive   = selectedTime === value;
                  const isOwn      = value === ownTime;
                  const isBooked   = bookedTimes.has(value) && !isOwn;
                  const isPast     = isTodaySelected && toMinutes(slot.time) <= istNow.minutes;
                  // Patient's own current slot is not re-bookable.
                  const isDisabled = isOwn || isBooked || isPast;
                  return (
                    <button key={slot.id} type="button"
                      disabled={isDisabled}
                      onClick={() => { if (!isDisabled) setSelectedTime(value); }}
                      className={`${styles.slotBtn} ${isActive ? styles.slotBtnActive : ""}`}>
                      <span>{fmt12(slot.time)}</span>
                      <span className={styles.slotMeta}>
                        {isOwn ? "Your current booking time"
                          : isBooked ? "Already booked"
                          : isPast ? "Unavailable"
                          : `${appointment.duration_minutes} min`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Link href="/patient" className={styles.backBtn}>← Cancel</Link>
          <button type="button" className={styles.primaryCta} disabled={!selectedDate || !selectedTime || submitting} onClick={handleConfirm}>
            {submitting ? "Saving…" : "Confirm Reschedule"}
          </button>
        </div>
      </main>
    </div>
  );
}
