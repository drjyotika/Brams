"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StepDateTime } from "./StepDateTime";
import { StepDetails }  from "./StepDetails";
import { StepConfirm }  from "./StepConfirm";
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

export type Step = 1 | 2 | 3;

export function BookingFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const planId = search.get("plan") ?? "initial";

  const [plan, setPlan]           = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [step, setStep]           = useState<Step>(1);

  // Step 1 state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  // Step 3 state
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Load the plan info
  useEffect(() => {
    fetch(`/api/plans/${planId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((p: PlanInfo) => setPlan(p))
      .catch(() => setPlanError(`Plan "${planId}" not found.`));
  }, [planId]);

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
    return <div className={styles.loadingShell}>Loading plan details…</div>;
  }

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {step === 1 && (
          <StepDateTime
            plan={plan}
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
            details={details}
            onChange={setDetails}
            onBack={() => setStep(1)}
            onSubmit={async () => {
              // Submit booking, get appointment id
              const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  plan_id:                 plan.id,
                  scheduled_date:          selectedDate,
                  scheduled_time:          selectedTime,
                  reason_for_consultation: details.reason || undefined,
                  patient: {
                    full_name: details.full_name,
                    age:       details.age ? parseInt(details.age, 10) : undefined,
                    gender:    details.gender || undefined,
                    phone:     details.phone,
                    email:     details.email || undefined,
                    city:      details.city || undefined,
                  },
                }),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Failed to create booking");
              }
              const data = await res.json();
              setBookingId(data.id);
              setStep(3);
            }}
          />
        )}

        {step === 3 && bookingId && (
          <StepConfirm
            plan={plan}
            bookingId={bookingId}
            scheduledDate={selectedDate!}
            scheduledTime={selectedTime!}
            patientName={details.full_name}
            onBack={() => setStep(2)}
          />
        )}
      </main>
    </div>
  );
}
