"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("unsettle-theme", theme);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  if (theme === null) {
    return <div className={compact ? "h-7 w-7" : "h-8 w-[68px]"} />;
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="hover-glow flex h-7 w-7 items-center justify-center rounded-sm border border-ink-700 text-text-dim hover:text-text cursor-pointer"
      >
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="hover-glow relative flex h-8 w-[68px] items-center rounded-full border border-ink-700 bg-ink-800 px-1 cursor-pointer"
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-stamp transition-transform duration-200 ease-out flex items-center justify-center text-ink-900 ${
          theme === "dark" ? "translate-x-[36px]" : "translate-x-0"
        }`}
      >
        {theme === "dark" ? <IconMoon small /> : <IconSun small />}
      </span>
    </button>
  );
}

function IconSun({ small }: { small?: boolean }) {
  const s = small ? 13 : 15;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ small }: { small?: boolean }) {
  const s = small ? 13 : 15;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.5A6 6 0 116.5 2.5a5 5 0 007 7z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
