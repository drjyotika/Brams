"use client";

import { useMemo, useRef, useState } from "react";
import type { PlanInfo } from "./index";
import { StickyFooter } from "./StickyFooter";
import { AlternativeRequestModal } from "./AlternativeRequestModal";
import styles from "./BookingFlow.module.scss";
import dtStyles from "./StepDateTime.module.scss";

const TIME_SLOTS = [
  "10:00 AM",
  "11:30 AM",
  "12:15 PM",
  "01:30 PM",
  "02:00 PM",
  "05:30 PM",
];

// Convert "10:00 AM" → "10:00:00"
function to24h(label: string): string {
  const m = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return "00:00:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

// ISO date for a given Date object (local timezone) → YYYY-MM-DD
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StepDateTime({
  plan,
  selectedDate,
  selectedTime,
  onSelect,
  onBack,
  onNext,
}: {
  plan: PlanInfo;
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
  const slotsRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

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
              const iso = isoDate(d);
              const isPast    = d < today;
              const isActive  = iso === selectedDate;
              const isToday   = iso === isoDate(today);
              return (
                <button
                  key={i}
                  type="button"
                  className={`${dtStyles.day} ${isActive ? dtStyles.dayActive : ""} ${isPast ? dtStyles.dayDisabled : ""} ${isToday ? dtStyles.dayToday : ""}`}
                  disabled={isPast}
                  onClick={() => { scrollToSlots(iso); onSelect(iso, selectedTime ?? ""); }}
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
              {new Date(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                month:   "short",
                day:     "numeric",
              })}
            </p>
          ) : (
            <p className={dtStyles.slotsHint}>Pick a date to see slots</p>
          )}

          <div className={dtStyles.slotsGrid}>
            {TIME_SLOTS.map((label) => {
              const value = to24h(label);
              const active = selectedTime === value;
              return (
                <button
                  key={label}
                  type="button"
                  className={`${dtStyles.slot} ${active ? dtStyles.slotActive : ""}`}
                  disabled={!selectedDate}
                  onClick={() => onSelect(selectedDate!, value)}
                >
                  <span className={dtStyles.slotTime}>{label}</span>
                  <span className={dtStyles.slotDuration}>{plan.duration_minutes} min</span>
                </button>
              );
            })}
          </div>

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
