"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const panelRef     = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

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

  // Close when clicking/tapping anywhere outside the panel (incl. the nav bar,
  // which sits above the backdrop and so isn't caught by it). The hamburger is
  // excluded so its own toggle isn't double-fired.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (hamburgerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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
        ref={hamburgerRef}
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
        <nav ref={panelRef} className={styles.mobileMenuPanel} aria-label="Mobile menu">
          {items.map(renderItem)}
        </nav>
      )}
    </>
  );
}
