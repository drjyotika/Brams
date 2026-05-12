"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./BookingFlow.module.scss";

type Props = {
  onBack: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
};

export function StickyFooter({
  onBack,
  backLabel = "← Back",
  onNext,
  nextLabel = "Continue →",
  nextDisabled = false,
  nextLoading = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className={styles.stickyFooter}>
      <div className={styles.stickyInner}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <span aria-hidden>←</span>
          <span>{backLabel.replace(/^←\s*/, "")}</span>
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={nextDisabled || nextLoading}
          onClick={onNext}
        >
          {nextLoading ? "Please wait…" : nextLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
