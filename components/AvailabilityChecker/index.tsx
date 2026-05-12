"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlternativeRequestModal } from "../BookingFlow/AlternativeRequestModal";
import type { PlanInfo } from "../BookingFlow";
import { BramsLoader } from "../BramsLoader";
import styles from "./AvailabilityChecker.module.scss";

// ─── Slot definitions (must match StepDateTime) ───────────────────────────────

const TIME_SLOTS = [
  "10:00 AM",
  "11:30 AM",
  "12:15 PM",
  "01:30 PM",
  "02:00 PM",
  "05:30 PM",
];

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

function isoDate(d: Date): string {
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

function formatDateLong(iso: string): string {
  // Add time portion to avoid UTC-shift on date-only strings
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime24(val: string): string {
  // "10:00:00" → "10:00 AM"
  const [hStr, minStr] = val.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${minStr} ${ampm}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AvailabilityChecker() {
  const search = useSearchParams();
  const planId = search.get("plan") ?? "priority";

  const [plan,      setPlan]      = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Calendar state
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewMonth,    setViewMonth]    = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(() => isoDate(today));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Availability state
  const [bookedTimes,   setBookedTimes]   = useState<Set<string>>(new Set());
  const [fetchingSlots, setFetchingSlots] = useState(false);

  const [altModalOpen, setAltModalOpen] = useState(false);
  const slotsRef = useRef<HTMLDivElement>(null);

  // Load plan info
  useEffect(() => {
    fetch(`/api/plans/${planId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((p: PlanInfo) => setPlan(p))
      .catch(() => setPlanError(`Plan "${planId}" not found.`));
  }, [planId]);

  // Fetch booked slots whenever date changes
  useEffect(() => {
    if (!selectedDate) return;
    setFetchingSlots(true);
    setSelectedTime(null); // reset time selection on date change
    fetch(`/api/availability?date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => setBookedTimes(new Set<string>(d.booked ?? [])))
      .catch(() => setBookedTimes(new Set()))
      .finally(() => setFetchingSlots(false));
  }, [selectedDate]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  function scrollToSlots(newIso: string) {
    if (newIso === selectedDate) return;
    if (window.innerWidth >= 1024) return;
    const el = slotsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }

  if (planError) {
    return (
      <div className={styles.shell}>
        <main className={styles.main}>
          <p>{planError}</p>
          <Link href="/#consultations" className={styles.backLink}>← Back to plans</Link>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={styles.shell}>
        <BramsLoader fullPage />
      </div>
    );
  }

  // URL to proceed to booking with pre-filled date + time
  const bookUrl = selectedDate && selectedTime
    ? `/book?plan=${plan.id}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`
    : null;

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {/* Header */}
        <Link href="/#consultations" className={styles.backLink}>
          ← Back to consultations
        </Link>

        <span className={styles.planChip}>
          {plan.eyebrow} · {plan.price}
        </span>

        <h1 className={styles.heading}>Check Availability</h1>
        <p className={styles.subheading}>
          Select a date to see which slots are open for <strong>{plan.title}</strong>.
          Pick an available slot to proceed with booking.
        </p>

        {/* Calendar + Slots */}
        <div className={styles.calendarLayout}>
          {/* Calendar */}
          <div className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <h3 className={styles.monthLabel}>{monthLabel}</h3>
              <div className={styles.monthNav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            <div className={styles.weekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className={styles.weekDay}>{d}</span>
              ))}
            </div>

            <div className={styles.grid}>
              {days.map((d, i) => {
                if (!d) return <span key={i} className={styles.empty} />;
                const iso     = isoDate(d);
                const isPast  = d < today;
                const isActive = iso === selectedDate;
                const isToday  = iso === isoDate(today);
                return (
                  <button
                    key={i}
                    type="button"
                    className={[
                      styles.day,
                      isActive  ? styles.dayActive   : "",
                      isPast    ? styles.dayDisabled  : "",
                      isToday   ? styles.dayToday     : "",
                    ].filter(Boolean).join(" ")}
                    disabled={isPast}
                    onClick={() => { scrollToSlots(iso); setSelectedDate(iso); }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          <div ref={slotsRef} className={styles.slotsCard}>
            <h3 className={styles.slotsTitle}>Available Slots</h3>

            {selectedDate ? (
              <p className={styles.slotsDate}>{formatDateLong(selectedDate)}</p>
            ) : (
              <p className={styles.slotsHint}>Pick a date to see slots</p>
            )}

            <div className={styles.slotsWrap}>
              <div className={styles.slotsGrid}>
                {TIME_SLOTS.map((label) => {
                  const value    = to24h(label);
                  const isBooked = bookedTimes.has(value);
                  const isSelected = selectedTime === value && !isBooked;

                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!selectedDate || isBooked || fetchingSlots}
                      onClick={() => setSelectedTime(isSelected ? null : value)}
                      className={[
                        styles.slot,
                        isBooked   ? styles.slotBooked   : "",
                        isSelected ? styles.slotSelected : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className={styles.slotTime}>{label}</span>
                      <span className={styles.slotDuration}>{plan.duration_minutes} min</span>
                      <span className={[
                        styles.slotBadge,
                        isBooked ? styles.badgeBooked : styles.badgeAvailable,
                      ].join(" ")}>
                        {isBooked ? "Booked" : "Available"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Loading overlay while fetching */}
              {fetchingSlots && (
                <div className={styles.slotsOverlay}>Checking availability…</div>
              )}
            </div>

            <div className={styles.waitlistNote}>
              Don&rsquo;t see a time that works?{" "}
              <button
                type="button"
                onClick={() => setAltModalOpen(true)}
              >
                Request an alternative appointment
              </button>
              {" "}and we&rsquo;ll reach out to confirm.
            </div>

            {altModalOpen && plan && (
              <AlternativeRequestModal
                plan={plan}
                onClose={() => setAltModalOpen(false)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Sticky booking bar — appears once a slot is selected */}
      {bookUrl && selectedDate && selectedTime && (
        <div className={styles.stickyBar}>
          <div className={styles.stickyInner}>
            <div className={styles.stickyInfo}>
              <span className={styles.stickyPlan}>{plan.title}</span>
              <span className={styles.stickyWhen}>
                {formatDateLong(selectedDate)} · {formatTime24(selectedTime)}
              </span>
              <span className={styles.stickyPrice}>{plan.price}</span>
            </div>
            <a href={bookUrl} className={styles.bookBtn}>
              Book This Slot →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
