"use client";

import { useEffect, useRef, useState } from "react";

// Shared by ReceiptTeaser and StatSection -- reports once an element has
// actually scrolled into the viewport, so their reveal/count-up animations
// play when a reader gets there instead of firing at mount time somewhere
// off-screen below the fold. Fires only once (unobserves after the first
// intersection) since these are one-shot reveals, not repeating effects.
export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
