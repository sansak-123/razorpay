"use client";

import { useEffect, useRef, useState } from "react";

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
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, start]);

  return <>{Math.round(display).toLocaleString("en-IN")}</>;
}
