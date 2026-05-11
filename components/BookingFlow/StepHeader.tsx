"use client";

import type { Step } from "./index";
import styles from "./BookingFlow.module.scss";

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  1: {
    title: "Choose Date & Time",
    subtitle:
      "Find a slot that works for you. All sessions are conducted via a secure, confidential video platform.",
  },
  2: {
    title: "Your Details",
    subtitle:
      "Help us understand you better before your session. All information shared here is strictly confidential.",
  },
  3: {
    title: "Confirm Your Booking",
    subtitle:
      "Review your details below. You can attach any reports or prior prescriptions (optional).",
  },
};

export function StepHeader({ step }: { step: Step }) {
  const meta = STEP_META[step];
  return (
    <div className={styles.stepHeader}>
      <div>
        <span className={styles.stepEyebrow}>Step {step} of 3</span>
        <h1 className={styles.stepTitle}>{meta.title}</h1>
        <p className={styles.stepSubtitle}>{meta.subtitle}</p>
      </div>
      <div className={styles.progress} aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
