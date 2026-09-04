"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4 transition-colors duration-300 ${
        scrolled ? "bg-navy-900/80 backdrop-blur-md border-b border-white/5" : "bg-transparent"
      }`}
    >
      <span
        className="text-[15px] font-semibold tracking-tight text-landing-white"
        style={{ fontFamily: "var(--font-space-grotesk)" }}
      >
        Unsettle
      </span>

      <div className="hidden md:flex items-center gap-8 text-[13.5px] text-landing-text-dim">
        <a href="#problem" className="hover:text-landing-white transition-colors">Problem</a>
        <a href="#how-it-works" className="hover:text-landing-white transition-colors">How it works</a>
        <a href="#try-it" className="hover:text-landing-white transition-colors">Try it live</a>
      </div>

      <Link
        href="/app"
        className="group flex items-center gap-1.5 rounded-full border border-blue bg-blue px-4 py-2 text-[13px] font-medium text-navy-900 transition-all hover:bg-transparent hover:text-blue"
      >
        Open Live Demo
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </nav>
  );
}
