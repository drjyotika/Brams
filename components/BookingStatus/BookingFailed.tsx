"use client";

import { useSearchParams } from "next/navigation";
import type { BookingFailedData } from "../../lib/content";
import styles from "./BookingStatus.module.scss";

export function BookingFailed({ data }: { data: BookingFailedData }) {
  const params = useSearchParams();
  const planId   = params.get("plan") ?? "initial";
  const errorMsg = params.get("error");

  // Replace {planId} token in href strings with the actual plan from the URL
  const resolveHref = (href: string) => href.replace(/\{planId\}/g, planId);

  return (
    <div className={styles.failedPage}>
      <main className={styles.failedMain}>
        <div className={styles.failedLayout}>
          {/* ── Left: decorative image card (desktop only) ─────────────── */}
          <div className={styles.decorativeCard} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment-decor.jpg"
              alt=""
              className={styles.decorativeImage}
            />
            <div className={styles.decorativeBlob} />
          </div>

          {/* ── Right: content ─────────────────────────────────────────── */}
          <div className={styles.failedContent}>
            <div className={styles.failedIconCircle} aria-hidden>❌</div>

            <div className={styles.failedTextBlock}>
              <h1 className={styles.failedTitle}>{data.title}</h1>
              <p className={styles.failedBody}>{data.body}</p>
            </div>

            {/* Actions — driven by data.ctas array (admin-editable) */}
            <div className={styles.failedActions}>
              {/* Primary CTAs */}
              {data.ctas.filter((c) => c.variant === "primary").map((cta) => (
                <a key={cta.id} href={resolveHref(cta.href)} className={styles.retryBtn}>
                  <span className={styles.retryBtnInner}>
                    {cta.emoji && `${cta.emoji} `}{cta.label}
                  </span>
                  <span>→</span>
                </a>
              ))}

              {/* Secondary CTAs row */}
              {data.ctas.some((c) => c.variant === "secondary") && (
                <div className={styles.failedSecondaryRow}>
                  {data.ctas.filter((c) => c.variant === "secondary").map((cta) => (
                    <a key={cta.id} href={resolveHref(cta.href)} className={styles.failedSecondaryBtn}>
                      {cta.emoji && `${cta.emoji} `}{cta.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Troubleshooting */}
            <div className={styles.troubleshootSection}>
              <div className={styles.troubleshootBox}>
                <span className={styles.troubleshootIcon} aria-hidden>⚠️</span>
                <div>
                  <p className={styles.troubleshootHeading}>{data.troubleshootTitle}</p>
                  <p className={styles.troubleshootBody}>{data.troubleshootBody}</p>
                  {errorMsg && (
                    <p className={styles.troubleshootBody} style={{ marginTop: 8, fontFamily: "monospace", fontSize: 13, opacity: 0.85 }}>
                      Details: {errorMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
