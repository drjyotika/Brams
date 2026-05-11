"use client";

import { useState } from "react";
import type { PatientDetails, PlanInfo } from "./index";
import { ConsultationSummary } from "./ConsultationSummary";
import styles from "./BookingFlow.module.scss";
import dStyles from "./StepDetails.module.scss";

export function StepDetails({
  plan,
  scheduledDate,
  scheduledTime,
  details,
  onChange,
  onBack,
  onSubmit,
}: {
  plan: PlanInfo;
  scheduledDate: string;
  scheduledTime: string;
  details: PatientDetails;
  onChange: (v: PatientDetails) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set = <K extends keyof PatientDetails>(k: K, v: PatientDetails[K]) =>
    onChange({ ...details, [k]: v });

  const canSubmit =
    details.full_name.trim().length > 1 &&
    details.phone.trim().length >= 7;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit();
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className={styles.stepHeader}>
        <div>
          <span className={styles.stepEyebrow}>Step 2 of 3</span>
          <h1 className={styles.stepTitle}>Your Details</h1>
          <p className={styles.stepSubtitle}>
            Help us understand you better before your session. All information shared
            here is strictly confidential.
          </p>
        </div>
        <div className={styles.progress}>
          <span className={`${styles.progressDot} ${styles.progressDotActive}`} />
          <span className={`${styles.progressDot} ${styles.progressDotActive}`} />
          <span className={styles.progressDot} />
        </div>
      </div>

      <div className={styles.layout}>
        {/* Form */}
        <div className={styles.card}>
          <div className={dStyles.row}>
            <Field label="Full name *">
              <input
                className={dStyles.input}
                value={details.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Enter your full legal name"
                required
              />
            </Field>
          </div>

          <div className={dStyles.row2}>
            <Field label="Age">
              <input
                className={dStyles.input}
                type="number"
                min={1}
                max={120}
                value={details.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="28"
              />
            </Field>
            <Field label="Gender">
              <select
                className={dStyles.input}
                value={details.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </Field>
          </div>

          <div className={dStyles.row2}>
            <Field label="Phone number *">
              <input
                className={dStyles.input}
                type="tel"
                value={details.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 9876 543 210"
                required
              />
            </Field>
            <Field label="Email">
              <input
                className={dStyles.input}
                type="email"
                value={details.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@example.com"
              />
            </Field>
          </div>

          <Field label="City">
            <input
              className={dStyles.input}
              value={details.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Current city of residence"
            />
          </Field>

          <Field label="Reason for consultation">
            <textarea
              className={dStyles.textarea}
              value={details.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="Briefly describe what you'd like to discuss during the session…"
              rows={4}
            />
          </Field>

          <p className={dStyles.uploadNote}>
            Reports can be uploaded after booking is confirmed.
          </p>

          {error && <p className={dStyles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.backBtn} onClick={onBack}>
              ← Back
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!canSubmit || submitting}
              onClick={submit}
            >
              {submitting ? "Saving…" : "Proceed to Payment →"}
            </button>
          </div>
        </div>

        {/* Summary sidebar */}
        <div>
          <ConsultationSummary
            plan={plan}
            scheduledDate={scheduledDate}
            scheduledTime={scheduledTime}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={dStyles.field}>
      <span className={dStyles.label}>{label}</span>
      {children}
    </label>
  );
}
