import styles from "./BramsLoader.module.scss";

/**
 * Shared branded loader shown while data is fetching.
 *
 * @param fullPage  Set true for route-level / full-viewport usage.
 *                  Default false keeps it inline (suitable for admin panels).
 */
export function BramsLoader({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={`${styles.wrap} ${fullPage ? styles.fullPage : ""}`}
      role="status"
      aria-label="Loading"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Brams Mind Care"
        className={styles.logo}
      />
      <div className={styles.dots} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
