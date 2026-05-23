"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlanInfo } from "./index";
import type { DaySchedule } from "../../lib/content";
import { StickyFooter } from "./StickyFooter";
import { AlternativeRequestModal } from "./AlternativeRequestModal";
import styles from "./BookingFlow.module.scss";
import dtStyles from "./StepDateTime.module.scss";

// "10:00" (24h) → "10:00 AM" / "13:30" → "01:30 PM"
function formatTime12(time: string): string {
  const [hStr, minStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${minStr} ${ampm}`;
}

// "10:00" → "10:00:00" (for DB storage)
function toDbTime(time: string): string {
  return `${time}:00`;
}

// ISO date for a given Date object (local timezone) → YYYY-MM-DD
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when the weekday has slots and is marked enabled in the schedule. */
function isDayAvailable(schedule: DaySchedule[], date: Date): boolean {
  const ds = schedule.find((s) => s.day === date.getDay());
  return !!(ds?.enabled && ds.slots.length > 0);
}

// "10:30" → 630 (minutes since midnight)
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Current date + minutes in IST (the clinic's timezone), so past-slot filtering
// is correct regardless of the visitor's local timezone.
function istNowParts(): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
  };
}

export function StepDateTime({
  plan,
  schedule,
  selectedDate,
  selectedTime,
  onSelect,
  onBack,
  onNext,
}: {
  plan: PlanInfo;
  schedule: DaySchedule[];
  selectedDate: string | null;
  selectedTime: string | null;
  onSelect: (date: string, time: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [altModalOpen, setAltModalOpen] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<Set<string>>(new Set());
  const slotsRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Fetch already-booked times for the selected date so they can be hidden.
  useEffect(() => {
    if (!selectedDate) { setBookedTimes(new Set()); return; }
    let cancelled = false;
    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : { booked: [] }))
      .then((d: { booked?: string[] }) => {
        if (!cancelled) setBookedTimes(new Set(d.booked ?? []));
      })
      .catch(() => { if (!cancelled) setBookedTimes(new Set()); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  // All slots for the currently selected date's weekday. Past/booked slots are
  // NOT removed — they're shown disabled (greyed out) with a status label.
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const [y, mo, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, mo - 1, d);
    const ds = schedule.find((s) => s.day === date.getDay());
    return ds?.enabled ? (ds.slots ?? []) : [];
  }, [selectedDate, schedule]);

  // For marking which of those slots are unavailable.
  const istNow = istNowParts();
  const isTodaySelected = !!selectedDate && selectedDate === istNow.dateStr;

  // Auto-scroll to the slots card when a new date is picked (mobile only —
  // on desktop the two cards are side-by-side and already in view).
  function scrollToSlots(newIso: string) {
    if (newIso === selectedDate) return;          // same date, no need to scroll
    if (window.innerWidth >= 1024) return;        // desktop: slots already visible
    const el = slotsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div>
      <div className={dtStyles.calendarLayout}>
        {/* Calendar */}
        <div className={dtStyles.calendarCard}>
          <div className={dtStyles.calendarHeader}>
            <h3 className={dtStyles.monthLabel}>{monthLabel}</h3>
            <div className={dtStyles.monthNav}>
              <button
                type="button"
                className={dtStyles.navBtn}
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className={dtStyles.navBtn}
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className={dtStyles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className={dtStyles.weekDay}>{d}</span>
            ))}
          </div>

          <div className={dtStyles.grid}>
            {days.map((d, i) => {
              if (!d) return <span key={i} className={dtStyles.empty} />;
              const iso         = isoDate(d);
              const isPast      = d < today;
              const isAvailable = isDayAvailable(schedule, d);
              const isDisabled  = isPast || !isAvailable;
              const isActive    = iso === selectedDate;
              const isToday     = iso === isoDate(today);
              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    dtStyles.day,
                    isActive    ? dtStyles.dayActive    : "",
                    isPast      ? dtStyles.dayDisabled  : !isAvailable ? dtStyles.dayUnavailable : "",
                    isToday     ? dtStyles.dayToday     : "",
                  ].join(" ")}
                  disabled={isDisabled}
                  onClick={() => { scrollToSlots(iso); onSelect(iso, ""); }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div ref={slotsRef} className={dtStyles.slotsCard}>
          <h3 className={dtStyles.slotsTitle}>Available Slots</h3>
          {selectedDate ? (
            <p className={dtStyles.slotsDate}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
                weekday: "long",
                month:   "short",
                day:     "numeric",
              })}
            </p>
          ) : (
            <p className={dtStyles.slotsHint}>Pick a date to see slots</p>
          )}

          {selectedDate && slotsForDate.length === 0 ? (
            <p className={dtStyles.slotsHint}>No slots available on this day.</p>
          ) : (
            <div className={dtStyles.slotsGrid}>
              {slotsForDate.map((slot) => {
                const value    = toDbTime(slot.time);
                const label    = formatTime12(slot.time);
                const active   = selectedTime === value;
                const isBooked = bookedTimes.has(value);
                const isPast   = isTodaySelected && toMinutes(slot.time) <= istNow.minutes;
                const isDisabled = isBooked || isPast;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`${dtStyles.slot} ${active ? dtStyles.slotActive : ""}`}
                    disabled={!selectedDate || isDisabled}
                    onClick={() => { if (!isDisabled) onSelect(selectedDate!, value); }}
                  >
                    <span className={dtStyles.slotTime}>{label}</span>
                    {isBooked ? (
                      <span className={dtStyles.slotDuration}>Already booked</span>
                    ) : isPast ? (
                      <span className={dtStyles.slotDuration}>Unavailable</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className={dtStyles.waitlistNote}>
            If you don&rsquo;t see availability that works for you,{" "}
            <button
              type="button"
              onClick={() => setAltModalOpen(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "inherit",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "inherit",
              }}
            >
              request an alternative appointment
            </button>.
          </div>

          {altModalOpen && (
            <AlternativeRequestModal
              plan={plan}
              onClose={() => setAltModalOpen(false)}
            />
          )}
        </div>
      </div>

      <StickyFooter
        onBack={onBack}
        backLabel="← Back to consultations"
        onNext={onNext}
        nextLabel="Continue →"
        nextDisabled={!selectedDate || !selectedTime}
      />
    </div>
  );
}

// Builds a 7-column grid with leading nulls for the days-of-week offset.
function buildMonthGrid(monthDate: Date): (Date | null)[] {
  const year  = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
