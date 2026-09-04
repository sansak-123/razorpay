"use client";

import { useEffect, useRef, useState } from "react";

// Animates a number from 0 to `value` -- pure presentation, the number
// itself always comes from the real report, never fabricated. Jumps
// straight to the final value under prefers-reduced-motion, same convention
// as the rest of the app's animations (see .stamp-in / .fade-in-up).
// `start` defaults to true (animate on mount, the dashboard's usage) but the
// landing page's StatSection passes an IntersectionObserver-driven boolean
// instead, so the count-up plays when a reader scrolls to it rather than at
// mount time somewhere off-screen below the fold.
export function CountUpNumber({
  value,
  duration = 900,
  start = true,
}: {
  value: number;
  duration?: number;
  start?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!start) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, start]);

  return <>{Math.round(display).toLocaleString("en-IN")}</>;
}
