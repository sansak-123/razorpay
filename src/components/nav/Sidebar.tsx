"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: IconGrid },
  { href: "/reconciliation", label: "Reconciliation Log", icon: IconList },
  { href: "/settlements", label: "Settlements", icon: IconStack },
  { href: "/tax", label: "Tax & GST", icon: IconPercent },
  { href: "/settings", label: "Data Source", icon: IconPlug },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top strip: hamburger only, shown below md. Fixed (not
          static) deliberately -- Sidebar returns a fragment, so a static
          sibling here would become a direct flex item of the parent's
          `flex` row (the fragment doesn't wrap it), splitting the screen
          into two columns instead of stacking. Fixed positioning takes it
          out of flow the same way the nav below already is. */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-ink-700 bg-ink-900">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="p-1.5 -ml-1.5 rounded-sm hover-glow border border-transparent"
        >
          <IconMenu />
        </button>
        <span className="font-mono text-[11px] tracking-widest text-stamp uppercase">
          Settlement Unpacker
        </span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <nav
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 shrink-0 border-r border-ink-700 bg-ink-900 flex flex-col transition-transform duration-200 ease-out md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6 border-b border-ink-700 hidden md:block">
          <div className="font-mono text-[10.5px] tracking-widest text-stamp uppercase">
            Razorpay · Track 04
          </div>
          <div className="font-display text-lg text-text mt-1">Settlement Unpacker</div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`group relative flex items-center gap-3 px-5 py-2.5 mx-2 rounded-sm text-[13.5px] transition-colors duration-150 ${
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
                {label}
              </Link>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-ink-700 hidden md:block font-mono text-[10px] text-text-dim leading-relaxed">
          Order-level reconciliation for lumped Razorpay settlements.
        </div>
      </nav>
    </>
  );
}

type IconProps = { className?: string };

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

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2.5 5H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 9H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.5 13H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
