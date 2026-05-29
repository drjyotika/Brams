'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

interface ParallaxLayerProps {
  children: ReactNode;
  /** Scroll multiplier — 0.1 is barely perceptible, 0.25 is cinematic. */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps its children in a div that translates vertically relative to the
 * scroll position, creating a parallax depth effect.
 * No-ops when prefers-reduced-motion: reduce is set.
 */
export function ParallaxLayer({
  children,
  speed = 0.15,
  className,
  style,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function tick() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = `translateY(${(-mid * speed).toFixed(2)}px)`;
    }

    function onScroll() {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(tick);
    }

    tick();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [speed]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: 'transform', ...style }}
    >
      {children}
    </div>
  );
}
