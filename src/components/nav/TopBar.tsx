import Link from "next/link";
import type { EnvStatus } from "@/lib/envStatus";

export function TopBar({ envStatus }: { envStatus: EnvStatus }) {
  return (
    <div className="hidden md:flex items-center justify-between px-8 py-4 border-b border-ink-700">
      <span className="font-mono text-[11px] tracking-widest text-text-dim uppercase">
        Order-level reconciliation for lumped Razorpay settlements
      </span>
      <Link
        href="/settings"
        className="hover-glow flex items-center gap-2 rounded-sm border border-ink-700 px-3 py-1.5 text-[11.5px] font-mono"
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
    </div>
  );
}
