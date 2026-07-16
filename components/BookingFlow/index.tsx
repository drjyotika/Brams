"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StepDateTime } from "./StepDateTime";
import { StepDetails }  from "./StepDetails";
import { StepHeader }   from "./StepHeader";
import { BramsLoader }  from "../BramsLoader";
import type { BookingStep1Data, BookingStep2Data } from "../../lib/content";
import { defaultContent } from "../../lib/content";
import styles from "./BookingFlow.module.scss";

export type PlanInfo = {
  id: string;
  title: string;
  eyebrow: string;
  price: string;
  unit: string;
  price_paise: number;
  duration_minutes: number;
};

export type PatientDetails = {
  full_name: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  city: string;
  reason: string;
};

export type Step = 1 | 2;

type BookingFlowProps = {
  // Server-resolved initial values — filled in for the plain (no query
  // param redirect) load so crawlers see real plan/price/step content in the
  // first response instead of just the loading spinner. Still refetched
  // client-side below to pick up any content edits since the last deploy.
  initialPlan?:         PlanInfo | null;
  initialStep1Config?:  BookingStep1Data;
  initialStep2Config?:  BookingStep2Data;
};

export function BookingFlow({ initialPlan = null, initialStep1Config, initialStep2Config }: BookingFlowProps) {
  const router = useRouter();
  const search = useSearchParams();
  const planId = search.get("plan") ?? "initial";

  // Follow-up consultations are for returning patients only, so they must be
  // signed in first. Gate this plan: route already-authenticated patients into
  // the pre-filled patient booking flow, and send everyone else to sign in and
  // return here afterwards.
  const requiresAuth = planId === "follow-up";

  const [plan, setPlan]           = useState<PlanInfo | null>(initialPlan);
  const [planError, setPlanError] = useState<string | null>(null);
  const [step, setStep]           = useState<Step>(1);

  // Booking flow config (time slots + form fields)
  const [step1Config, setStep1Config] = useState<BookingStep1Data>(initialStep1Config ?? defaultContent.bookingStep1);
  const [step2Config, setStep2Config] = useState<BookingStep2Data>(initialStep2Config ?? defaultContent.bookingStep2);

  // Step 1 state — pre-select today so the calendar is never blank on load
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 2 state
  const [details, setDetails] = useState<PatientDetails>({
    full_name: "",
    age:       "",
    gender:    "",
    phone:     "",
    email:     "",
    city:      "",
    reason:    "",
  });

  // Auth gate for follow-up bookings — resolve sign-in state, then redirect.
  useEffect(() => {
    if (!requiresAuth) return;
    let cancelled = false;
    const next = encodeURIComponent("/patient/book?plan=follow-up");
    fetch("/api/patient/me")
      .then((r) => {
        if (cancelled) return;
        // Signed in → continue in the patient flow (profile pre-filled, OTP
        // skipped). Otherwise → sign in first, then come back to this booking.
        if (r.ok) router.replace("/patient/book?plan=follow-up");
        else      router.replace(`/patient/login?next=${next}`);
      })
      .catch(() => {
        if (!cancelled) router.replace(`/patient/login?next=${next}`);
      });
    return () => { cancelled = true; };
  }, [requiresAuth, router]);

  // Load plan info + booking flow config in parallel
  useEffect(() => {
    if (requiresAuth) return; // handled by the auth gate above
    fetch(`/api/plans/${planId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((p: PlanInfo) => setPlan(p))
      .catch(() => setPlanError(`Plan "${planId}" not found.`));

    fetch("/api/booking-config")
      .then((r) => r.json())
      .then((cfg: { step1: BookingStep1Data; step2: BookingStep2Data }) => {
        if (cfg.step1) setStep1Config(cfg.step1);
        if (cfg.step2) setStep2Config(cfg.step2);
      })
      .catch(() => { /* keep defaults */ });
  }, [planId, requiresAuth]);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // While the follow-up auth gate resolves (and redirects away), show a loader.
  if (requiresAuth) {
    return <BramsLoader fullPage />;
  }

  if (planError) {
    return (
      <div className={styles.errorShell}>
        <h2>Something went wrong</h2>
        <p>{planError}</p>
        <Link href="/#consultations" className={styles.backLink}>← Back to plans</Link>
      </div>
    );
  }

  if (!plan) {
    return <BramsLoader fullPage />;
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <StepHeader step={step} />

        {step === 1 && (
          <StepDateTime
            plan={plan}
            schedule={step1Config.schedule}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelect={(date, time) => {
              setSelectedDate(date);
              setSelectedTime(time);
            }}
            onBack={() => router.push("/#consultations")}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && selectedDate && selectedTime && (
          <StepDetails
            plan={plan}
            scheduledDate={selectedDate}
            scheduledTime={selectedTime}
            fields={step2Config.fields}
            details={details}
            onChange={setDetails}
            onBack={() => setStep(1)}
          />
        )}
      </main>
    </div>
  );
}
