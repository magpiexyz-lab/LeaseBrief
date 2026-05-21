"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

/**
 * Reveal — scroll-triggered fade-up with blur (BlurFade equivalent).
 *
 * Content is VISIBLE BY DEFAULT — opacity stays at 1 across SSR, hydration,
 * no-JS, full-page screenshots, and prefers-reduced-motion. The animation is
 * strictly ADDITIVE: when JS mounts, we briefly hide elements that haven't
 * been seen yet by applying a transform + filter (NOT opacity:0), then on
 * IntersectionObserver fire we transition the transform/filter back to neutral.
 *
 * Implementation detail: we delay applying the "hidden" state until after the
 * first paint via a useEffect, so the SSR HTML always renders visible. If JS
 * never runs (or fails), content stays visible — robustness over polish.
 */
export function Reveal({
  children,
  delay = 0,
  duration = 600,
  y = 24,
  blur = 12,
  className = "",
  as: As = "div",
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  blur?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  // phase: "ssr"   -> first render, fully visible (no transform applied)
  //        "pre"   -> JS mounted, element not yet intersected, apply transform
  //        "shown" -> intersected (or reduce-motion); animate back to neutral
  const [phase, setPhase] = useState<"ssr" | "pre" | "shown">("ssr");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("shown");
      return;
    }

    // If the element is already in view at mount, just stay visible.
    const rect = node.getBoundingClientRect();
    const inViewportAtMount =
      rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewportAtMount) {
      setPhase("shown");
      return;
    }

    // Element is below the fold — apply the pre-animation state, then watch.
    setPhase("pre");

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPhase("shown");
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    obs.observe(node);

    // Safety net: if for any reason the observer never fires within 2.5s of
    // mount (e.g., headless screenshot tools that render the full page without
    // scrolling), reveal everything anyway. Animations are decoration, not gate.
    const safetyTimer = window.setTimeout(() => {
      setPhase("shown");
      obs.disconnect();
    }, 2500);

    return () => {
      obs.disconnect();
      window.clearTimeout(safetyTimer);
    };
  }, []);

  const hidden = phase === "pre";
  const transform = hidden ? `translateY(${y}px)` : "translateY(0)";
  const filter = hidden ? `blur(${blur}px)` : "blur(0px)";

  const combined: CSSProperties = {
    transform,
    filter,
    transitionProperty: "transform, filter",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    transitionDelay: phase === "shown" ? `${delay}ms` : "0ms",
    willChange: hidden ? "transform, filter" : "auto",
    ...style,
  };

  const Tag = As as unknown as React.ElementType;
  return (
    <Tag ref={ref as never} className={className} style={combined}>
      {children}
    </Tag>
  );
}
