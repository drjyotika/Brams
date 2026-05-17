"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./TopNavBar.module.scss";

export type MobileMenuItem = {
  label:   string;
  href?:   string;
  onClick?: () => void;
  /** Visual variant — defaults to "default". */
  variant?: "default" | "primary" | "danger";
  /** Mark this item as currently active. */
  active?:  boolean;
};

export function MobileMenu({
  items,
  ariaLabel = "Open menu",
}: {
  items: MobileMenuItem[];
  /** Visible accessible label for the hamburger button. */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-close on resize past mobile breakpoint
  useEffect(() => {
    if (!open) return;
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  function renderItem(item: MobileMenuItem, i: number): ReactNode {
    const cls = `${styles.mobileMenuItem} ${item.variant ? styles[`mobileMenuItem_${item.variant}`] : ""} ${item.active ? styles.mobileMenuItemActive : ""}`;
    const handle = () => {
      setOpen(false);
      item.onClick?.();
    };
    if (item.href) {
      return (
        <a key={i} href={item.href} className={cls} onClick={handle}>
          {item.label}
        </a>
      );
    }
    return (
      <button key={i} type="button" className={cls} onClick={handle}>
        {item.label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.hamburger}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`${styles.hamburgerBar} ${open ? styles.hamburgerBarTop : ""}`} />
        <span className={`${styles.hamburgerBar} ${open ? styles.hamburgerBarMid : ""}`} />
        <span className={`${styles.hamburgerBar} ${open ? styles.hamburgerBarBot : ""}`} />
      </button>

      {open && (
        <>
          <div
            className={styles.mobileMenuBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className={styles.mobileMenuPanel} aria-label="Mobile menu">
            {items.map(renderItem)}
          </nav>
        </>
      )}
    </>
  );
}
