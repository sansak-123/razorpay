"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: IconGrid },
  { href: "/app/chat", label: "Ask AI", icon: IconChat },
  { href: "/app/reconciliation", label: "Reconciliation Log", icon: IconList },
  { href: "/app/settlements", label: "Settlements", icon: IconStack },
  { href: "/app/tax", label: "Tax & GST", icon: IconPercent },
  { href: "/app/settings", label: "Data Source", icon: IconPlug },
] as const;

const COLLAPSE_KEY = "unsettle-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    setReady(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  }

  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-700 bg-ink-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="p-1.5 -ml-1.5 rounded-sm hover-glow border border-transparent"
          >
            <IconMenu />
          </button>
          <span className="font-mono text-[12.5px] tracking-widest text-stamp uppercase">
            Unsettle
          </span>
        </div>
        <ThemeToggle compact />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <nav
        className={`fixed md:static z-40 top-0 left-0 h-full shrink-0 border-r border-ink-700 bg-ink-900 flex flex-col transition-[transform,width] duration-200 ease-out md:translate-x-0 w-64 ${
          collapsed ? "md:w-[76px]" : "md:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"} ${ready ? "" : "md:invisible"}`}
      >
        <div className={`border-b border-ink-700 hidden md:flex items-center ${collapsed ? "justify-center px-3 py-6" : "justify-between px-5 py-6"}`}>
          {collapsed ? (
            <span className="font-display text-lg text-stamp">U</span>
          ) : (
            <div>
              <div className="font-mono text-[12px] tracking-widest text-stamp uppercase">
                Settlement reconciliation
              </div>
              <div className="font-display text-lg text-text mt-1">Unsettle</div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setOpen(false)}
                className={`group relative flex items-center gap-3 py-2.5 mx-2 rounded-sm text-[16px] transition-colors duration-150 ${
                  collapsed ? "md:justify-center md:px-0 px-5" : "px-5"
                } ${
                  isActive
                    ? "text-text bg-ink-800"
                    : "text-text-dim hover:text-text hover:bg-ink-800/60"
                }`}
              >
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-stamp transition-opacity duration-150 ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
                <Icon
                  className={`shrink-0 transition-colors duration-150 ${
                    isActive ? "text-stamp" : "text-text-dim group-hover:text-stamp-dim"
                  }`}
                />
                <span className={collapsed ? "md:hidden" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>

        <div className={`border-t border-ink-700 hidden md:flex items-center gap-2 px-3 py-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && <ThemeToggle />}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hover-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ink-700 text-text-dim hover:text-text cursor-pointer"
          >
            <IconCollapse collapsed={collapsed} />
          </button>
        </div>

        {!collapsed && (
          <div className="px-5 py-4 border-t border-ink-700 hidden md:block font-mono text-[12px] text-text-dim leading-relaxed">
            Rules resolve what they can for free. AI only reasons about what&apos;s
            genuinely unsure — and every AI judgment is independently verified
            before it&apos;s trusted.
          </div>
        )}
      </nav>
    </>
  );
}

type IconProps = { className?: string };

function IconChat({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 11v2.5l3-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconGrid({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconList({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="2.5" cy="3" r="1" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" />
      <circle cx="2.5" cy="13" r="1" fill="currentColor" />
      <path d="M6 3H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 8H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 13H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconStack({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 1.5L14.5 5L8 8.5L1.5 5L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 8.5L8 12L14.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 11.5L8 15L14.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconPercent({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="4.2" cy="4.2" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.8" cy="11.8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12.5 2.5L2.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconPlug({ className }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M5.5 1.5V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.5 1.5V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="3.5" y="5.5" width="9" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 10V12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconCollapse({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
    >
      <path d="M10.5 3L5.5 8L10.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2.5 5H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 9H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 13H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
