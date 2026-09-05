"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EnvStatus } from "@/lib/envStatus";
import { signOutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "./ThemeToggle";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Overview",
  "/app/chat": "Ask AI",
  "/app/reconciliation": "Reconciliation Log",
  "/app/settlements": "Settlements",
  "/app/tax": "Tax & GST",
  "/app/settings": "Data Source",
};

export function TopBar({
  envStatus,
  userEmail,
}: {
  envStatus: EnvStatus;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES[pathname] ?? "";

  return (
    <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-ink-700">
      <span className="font-mono text-[12.5px] tracking-widest text-text-dim uppercase">
        {pageTitle}
      </span>
      <div className="flex items-center gap-3">
        <ThemeToggle compact />
        <Link
          href="/app/settings"
          className="hover-glow flex items-center gap-2 rounded-sm border border-ink-700 px-3 py-1.5 text-[13px] font-mono"
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              envStatus.liveMode ? "bg-sage" : "bg-stamp"
            }`}
          />
          <span className="text-text-dim">
            {envStatus.liveMode ? "Live data" : "Synthetic data"}
          </span>
        </Link>
        {userEmail && (
          <div className="flex items-center gap-2 text-[13px] font-mono text-text-dim">
            <span className="max-w-[160px] truncate">{userEmail}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="hover-glow rounded-sm border border-ink-700 px-2.5 py-1.5 text-text-dim hover:text-text cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
