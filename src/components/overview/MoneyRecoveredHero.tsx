import type { ReportSummary } from "@/lib/types";
import { CountUpNumber } from "./CountUpNumber";

// The hero of the whole app: one hard rupee number, not a match-rate
// percentage. "GST ITC claimable" is money the merchant can legitimately
// file for but usually can't quantify by hand; "surfaced" is duplicate
// settlements and unexplained gaps the rule engine + Claude actually caught.
// Both numbers come straight from the same Report every other page reads --
// nothing here is a separate, dramatized calculation.
export function MoneyRecoveredHero({ summary }: { summary: ReportSummary }) {
  const total = summary.gst_itc_claimable + summary.money_surfaced_by_agent;

  return (
    <div className="hover-glow relative overflow-hidden rounded-sm border border-stamp/30 bg-gradient-to-br from-ink-800 to-ink-900 px-6 py-8 md:px-9 md:py-10 mb-6">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--color-stamp)" }}
        aria-hidden
      />
      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-widest text-stamp mb-3">
          Money this settlement was hiding
        </div>
        <div className="font-display text-6xl md:text-7xl font-normal tracking-tight text-text">
          ₹<CountUpNumber value={Math.round(total)} />
        </div>
        <p className="text-text-dim text-[14.5px] mt-3 max-w-lg leading-relaxed">
          Claimable tax credit and money the bank statement never itemised —
          quantified automatically, not estimated.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px] rounded-sm border border-sage/30 bg-ink-900/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" />
              <span className="font-mono text-[10.5px] uppercase tracking-wide text-text-dim">
                GST ITC claimable
              </span>
            </div>
            <div className="font-mono text-xl font-semibold text-sage">
              ₹{summary.gst_itc_claimable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex-1 min-w-[220px] rounded-sm border border-brick/30 bg-ink-900/60 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-brick" />
              <span className="font-mono text-[10.5px] uppercase tracking-wide text-text-dim">
                Surfaced: duplicates + unexplained
              </span>
            </div>
            <div className="font-mono text-xl font-semibold text-brick">
              ₹{summary.money_surfaced_by_agent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <p className="font-mono text-[11px] text-text-dim mt-4">
          A manual VLOOKUP process matches ~{summary.baseline_manual_match_rate_pct}% of
          orders by hand — this is exactly the money that hides in the other{" "}
          {round1(100 - summary.baseline_manual_match_rate_pct)}%.
        </p>
      </div>
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
