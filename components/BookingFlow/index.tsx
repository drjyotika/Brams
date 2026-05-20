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

export function BookingFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const planId = search.get("plan") ?? "initial";

  const [plan, setPlan]           = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [step, setStep]           = useState<Step>(1);

  // Booking flow config (time slots + form fields)
  const [step1Config, setStep1Config] = useState<BookingStep1Data>(defaultContent.bookingStep1);
  const [step2Config, setStep2Config] = useState<BookingStep2Data>(defaultContent.bookingStep2);

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

  // Load plan info + booking flow config in parallel
  useEffect(() => {
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
  }, [planId]);

  // Scroll to top on step change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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
