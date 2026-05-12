"use client";

import { useState } from "react";
import type { PatientDetails, PlanInfo } from "./index";
import type { BookingField } from "../../lib/content";
import { ConsultationSummary } from "./ConsultationSummary";
import { StickyFooter } from "./StickyFooter";
import styles from "./BookingFlow.module.scss";
import dStyles from "./StepDetails.module.scss";

export function StepDetails({
  plan,
  scheduledDate,
  scheduledTime,
  fields,
  details,
  onChange,
  onBack,
  onSubmit,
}: {
  plan: PlanInfo;
  scheduledDate: string;
  scheduledTime: string;
  fields: BookingField[];
  details: PatientDetails;
  onChange: (v: PatientDetails) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const set = (key: BookingField["key"], val: string) =>
    onChange({ ...details, [key]: val });

  // Validate only visible + required fields
  const visibleRequired = fields.filter((f) => f.visible && f.required);
  const canSubmit = visibleRequired.every((f) => {
    const val = details[f.key] ?? "";
    return val.trim().length >= (f.key === "phone" ? 7 : 2);
  });

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
      <div className={styles.layout}>
        {/* Dynamic form */}
        <div className={styles.card}>
          <div className={dStyles.fieldsGrid}>
            {fields.filter((f) => f.visible).map((f) => (
              <div
                key={f.id}
                className={f.width === "full" ? dStyles.colFull : dStyles.colHalf}
              >
                <label className={dStyles.field}>
                  <span className={dStyles.label}>
                    {f.label}{f.required ? " *" : ""}
                  </span>

                  {f.type === "select" ? (
                    <select
                      className={dStyles.input}
                      value={details[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "-")}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className={dStyles.textarea}
                      value={details[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      rows={4}
                    />
                  ) : (
                    <input
                      className={dStyles.input}
                      type={f.type}
                      value={details[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      required={f.required}
                      min={f.type === "number" ? 1 : undefined}
                      max={f.type === "number" ? 120 : undefined}
                    />
                  )}
                </label>
              </div>
            ))}
          </div>

          <p className={dStyles.uploadNote}>
            Reports can be uploaded after booking is confirmed.
          </p>

          {error && <p className={dStyles.error}>{error}</p>}
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

      <StickyFooter
        onBack={onBack}
        backLabel="← Back"
        onNext={submit}
        nextLabel="Proceed to Payment →"
        nextDisabled={!canSubmit}
        nextLoading={submitting}
      />
    </div>
  );
}
