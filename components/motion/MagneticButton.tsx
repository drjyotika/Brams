'use client';
import {
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from 'react';

interface MagneticButtonProps {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Magnetic pull strength — 0.2 is subtle, 0.45 is strong. */
  strength?: number;
}

/**
 * An <a> tag whose body gently follows the cursor on hover, then springs
 * back to its origin on mouse-leave. No-ops for prefers-reduced-motion.
 */
export function MagneticButton({
  href,
  className,
  style,
  children,
  strength = 0.28,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = ref.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      const dx = ((e.clientX - (left + width / 2)) * strength).toFixed(1);
      const dy = ((e.clientY - (top + height / 2)) * strength).toFixed(1);
      el.style.transition = 'transform 100ms linear';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [strength],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'translate(0, 0)';
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </a>
  );
}
