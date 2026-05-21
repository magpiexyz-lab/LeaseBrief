"use client";

import { useEffect, useRef, useState } from "react";

/**
 * NumberTicker — counts from 0 to `value` once the element scrolls into view.
 * Snappy expo-out easing, respects prefers-reduced-motion (jumps to final).
 * Render is visible-by-default (final value shown if reduce-motion or pre-mount).
 */
export function NumberTicker({
  value,
  duration = 1600,
  suffix = "",
  prefix = "",
  className = "",
  decimals = 0,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let started = false;
    let startTime = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // expo-out, snappy
    const tick = (now: number) => {
      if (!started) {
        startTime = now;
        started = true;
      }
      const t = Math.min(1, (now - startTime) / duration);
      const eased = ease(t);
      setDisplay(value * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDisplay(0);
            raf = requestAnimationFrame(tick);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [value, duration]);

  const factor = Math.pow(10, decimals);
  const rounded = Math.round(display * factor) / factor;
  const formatted = decimals === 0 ? Math.round(rounded).toLocaleString() : rounded.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
