"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./BookingStatus.module.scss";

export function BookingFailed() {
  const params   = useSearchParams();
  const planId   = params.get("plan") ?? "initial";

  return (
    <div className={styles.failedPage}>
      <main className={styles.failedMain}>
        <div className={styles.failedLayout}>
          {/* ── Left: decorative image card (desktop only) ────────────────── */}
          <div className={styles.decorativeCard} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/payment-decor.jpg"
              alt=""
              className={styles.decorativeImage}
            />
            <div className={styles.decorativeBlob} />
          </div>

          {/* ── Right: content ────────────────────────────────────────────── */}
          <div className={styles.failedContent}>
            {/* Status icon */}
            <div className={styles.failedIconCircle} aria-hidden>❌</div>

            {/* Heading + body */}
            <div className={styles.failedTextBlock}>
              <h1 className={styles.failedTitle}>Payment Failed</h1>
              <p className={styles.failedBody}>
                Your payment could not be completed. Don&rsquo;t worry — your
                appointment slot is still temporarily held.
              </p>
            </div>

            {/* Actions */}
            <div className={styles.failedActions}>
              {/* Primary — Retry */}
              <Link
                href={`/book?plan=${planId}`}
                className={styles.retryBtn}
              >
                <span className={styles.retryBtnInner}>
                  🔄 Retry Payment
                </span>
                <span>→</span>
              </Link>

              {/* Secondary row */}
              <div className={styles.failedSecondaryRow}>
                <Link href={`/book?plan=${planId}`} className={styles.failedSecondaryBtn}>
                  💳 Change Method
                </Link>
                <a
                  href="mailto:support@bramsmindcare.com"
                  className={styles.failedSecondaryBtn}
                >
                  💬 Contact Support
                </a>
              </div>
            </div>

            {/* Troubleshooting info */}
            <div className={styles.troubleshootSection}>
              <div className={styles.troubleshootBox}>
                <span className={styles.troubleshootIcon} aria-hidden>⚠️</span>
                <div>
                  <p className={styles.troubleshootHeading}>Troubleshooting</p>
                  <p className={styles.troubleshootBody}>
                    Please check your internet connection or contact your bank if
                    the issue persists. No charges have been made to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
