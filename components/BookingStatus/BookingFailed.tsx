"use client";

import { useSearchParams } from "next/navigation";
import type { BookingFailedData } from "../../lib/content";
import styles from "./BookingStatus.module.scss";

export function BookingFailed({ data }: { data: BookingFailedData }) {
  const params = useSearchParams();
  const planId = params.get("plan") ?? "initial";

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

            <div className={styles.failedActions}>
              {/* Primary — Retry */}
              <a
                href={`/book?plan=${planId}`}
                className={styles.retryBtn}
              >
                <span className={styles.retryBtnInner}>🔄 {data.retryLabel}</span>
                <span>→</span>
              </a>

              {/* Secondary row */}
              <div className={styles.failedSecondaryRow}>
                <a href={`/book?plan=${planId}`} className={styles.failedSecondaryBtn}>
                  💳 {data.changeMethodLabel}
                </a>
                <a
                  href={`mailto:${data.supportEmail}`}
                  className={styles.failedSecondaryBtn}
                >
                  💬 {data.supportLabel}
                </a>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className={styles.troubleshootSection}>
              <div className={styles.troubleshootBox}>
                <span className={styles.troubleshootIcon} aria-hidden>⚠️</span>
                <div>
                  <p className={styles.troubleshootHeading}>{data.troubleshootTitle}</p>
                  <p className={styles.troubleshootBody}>{data.troubleshootBody}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
