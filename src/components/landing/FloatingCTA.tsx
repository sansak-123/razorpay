"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function FloatingCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const pastHero = window.scrollY > 600;
      const nearFooter =
        window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 500;
      setVisible(pastHero && !nearFooter);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Link
      href="/app"
      className={`group fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-blue px-5 py-3 text-[15px] font-semibold text-navy-900 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] transition-all duration-300 hover:shadow-[0_0_0_1px_var(--color-blue),0_8px_28px_-6px_var(--color-blue)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      Sign up / Sign in
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}
