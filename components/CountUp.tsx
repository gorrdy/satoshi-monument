"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plynulé „natočení" čísla z 0 na cílovou hodnotu, jakmile je prvek vidět.
 * Re-animuje při změně `value` (živá aktualizace sbírky).
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 1100,
  className = "",
  format,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      const start = performance.now();
      const startVal = from.current;
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setDisplay(startVal + (value - startVal) * eased);
        if (t < 1) requestAnimationFrame(animate);
        else from.current = value;
      };
      requestAnimationFrame(animate);
    };

    if (started.current) {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          started.current = true;
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  const text = format
    ? format(display)
    : display.toLocaleString("cs-CZ", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
