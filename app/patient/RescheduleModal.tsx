"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DaySchedule } from "../../lib/content";
import { defaultContent } from "../../lib/content";
import { BramsLoader } from "../../components/BramsLoader";

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
  const year  = monthDate.getFullYear();
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
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function RescheduleModal({ appointment, onClose, onRescheduled }: {
  appointment: Appointment;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultContent.bookingStep1.schedule);
  const [configLoading, setConfigLoading] = useState(true);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);

  // Fetch booking config for live schedule
  useEffect(() => {
    fetch("/api/booking-config")
      .then(r => r.json())
      .then(cfg => { if (cfg?.step1?.schedule) setSchedule(cfg.step1.schedule); })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  // Lock body scroll + Escape key
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const ds = schedule.find(s => s.day === new Date(y, mo - 1, d).getDay());
    return ds?.enabled ? (ds.slots ?? []) : [];
  }, [selectedDate, schedule]);

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  async function handleConfirm() {
    if (!selectedDate || !selectedTime) return;
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
      setDone(true);
      onRescheduled();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
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
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,.18)", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid rgba(207,195,204,.25)", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9b8fa0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              {appointment.plan_title}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b24" }}>
              {done ? "Reschedule Confirmed" : "Reschedule Appointment"}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, color: "#9b8fa0",
            cursor: "pointer", lineHeight: 1, padding: 4,
          }} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Done state ── */}
          {done ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#1e1b24", marginBottom: 8 }}>
                Appointment rescheduled!
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px" }}>
                New date: <strong>{selectedDate ? fmtDate(selectedDate) : ""}</strong> at <strong>{selectedTime ? fmt12(selectedTime.slice(0,5)) : ""}</strong>
              </p>
              <p style={{ fontSize: 12, color: "#9b8fa0", margin: "0 0 24px" }}>
                Our team will confirm your new slot shortly.
              </p>
              <button onClick={onClose} style={{
                background: "#745475", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Back to Dashboard</button>
            </div>
          ) : configLoading ? (
            <BramsLoader />
          ) : (
            <>
              {/* Current appointment info */}
              <div style={{
                background: "#faf9fb", border: "1px solid rgba(207,195,204,.3)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 20,
                fontSize: 13, color: "#4c444b",
              }}>
                <span style={{ fontWeight: 600 }}>Current: </span>
                {fmtDate(appointment.scheduled_date)} at {fmt12(appointment.scheduled_time.slice(0,5))} · {appointment.duration_minutes} min
              </div>

              <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b24", marginBottom: 14, marginTop: 0 }}>
                Choose a new date and time:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Calendar */}
                <div style={{ border: "1px solid rgba(207,195,204,.35)", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1e1b24" }}>{monthLabel}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {([["‹", -1], ["›", 1]] as const).map(([label, dir]) => (
                        <button key={label} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + dir, 1))}
                          style={{ background: "none", border: "1px solid rgba(207,195,204,.4)", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 14, color: "#4c444b" }}>
                          {label}
                        </button>
                      ))}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <span key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#9b8fa0", padding: "3px 0" }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                    {days.map((d, i) => {
                      if (!d) return <span key={i} />;
                      const iso     = isoDate(d);
                      const isPast  = d < today;
                      const isAvail = isDayAvailable(schedule, d);
                      const isActive = iso === selectedDate;
                      return (
                        <button key={i} disabled={isPast || !isAvail}
                          onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                          style={{
                            width: "100%", aspectRatio: "1", border: "none", borderRadius: 6,
                            fontSize: 11, fontWeight: isActive ? 700 : 500,
                            background: isActive ? "#745475" : "transparent",
                            color: isActive ? "#fff" : isPast || !isAvail ? "#d1c7d0" : "#1e1b24",
                            cursor: isPast || !isAvail ? "default" : "pointer",
                          }}
                        >{d.getDate()}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div style={{ border: "1px solid rgba(207,195,204,.35)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e1b24", marginBottom: 10 }}>
                    Available Slots
                  </div>
                  {!selectedDate ? (
                    <p style={{ fontSize: 12, color: "#9b8fa0" }}>Pick a date to see slots.</p>
                  ) : slotsForDate.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9b8fa0" }}>No slots on this day.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {slotsForDate.map(slot => {
                        const value    = `${slot.time}:00`;
                        const isActive = selectedTime === value;
                        return (
                          <button key={slot.id} onClick={() => setSelectedTime(value)}
                            style={{
                              padding: "9px 12px", border: "1.5px solid",
                              borderColor: isActive ? "#745475" : "rgba(207,195,204,.4)",
                              borderRadius: 8, background: isActive ? "#f5f0f5" : "#faf9fb",
                              cursor: "pointer", textAlign: "left",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: isActive ? "#745475" : "#1e1b24" }}>{fmt12(slot.time)}</span>
                            <span style={{ fontSize: 11, color: "#9b8fa0" }}>{appointment.duration_minutes} min</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 14, marginBottom: 0 }}>{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && !configLoading && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 24px", borderTop: "1px solid rgba(207,195,204,.25)",
            background: "#fff", gap: 12, flexShrink: 0,
          }}>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid rgba(207,195,204,.5)",
              borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600,
              color: "#4c444b", cursor: "pointer",
            }}>Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime || submitting}
              style={{
                background: (!selectedDate || !selectedTime || submitting) ? "#c4b5c4" : "#745475",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 24px", fontSize: 13, fontWeight: 700,
                cursor: (!selectedDate || !selectedTime || submitting) ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Saving…" : "Confirm Reschedule"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
