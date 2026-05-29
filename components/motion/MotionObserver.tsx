'use client';
import { useEffect } from 'react';

/**
 * Wires the scroll-reveal system:
 *  1. Adds `html.motion-ready` so the CSS hides [data-reveal] elements.
 *  2. Creates an IntersectionObserver that adds `.is-visible` as elements
 *     scroll into view — triggering the CSS keyframe reveal animation.
 *
 * Rendered once in the root layout.
 */
export function MotionObserver() {
  useEffect(() => {
    // Activate CSS hidden state for all [data-reveal] elements
    document.documentElement.classList.add('motion-ready');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target); // one-shot: stop watching once revealed
          }
        });
      },
      {
        // Fire as soon as 5 % of the element is visible — generous enough
        // that fast scrollers always see sections appear, not disappear.
        threshold: 0.05,
      },
    );

    const observeAll = () => {
      document
        .querySelectorAll('[data-reveal]:not(.is-visible)')
        .forEach((el) => io.observe(el));
    };

    observeAll();

    // Re-run if Next.js streams in additional content after initial mount
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
