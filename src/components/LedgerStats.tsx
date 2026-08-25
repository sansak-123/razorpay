import type { ReportSummary } from "@/lib/types";

// A ledger-line stat block instead of a generic 4-box stat grid: label,
// dotted leader, value -- the visual grammar of a real account statement or
// table of contents, not a SaaS metrics tile. Encodes something true: these
// ARE line items in an account, not abstract KPIs.
export function LedgerStats({ summary }: { summary: ReportSummary }) {
  const rows: { label: string; value: string; tone?: string }[] = [
    {
      label: "Match rate",
      value: `${summary.match_rate_pct}%  (${summary.matched_orders}/${summary.total_orders} orders)`,
      tone: "text-sage",
    },
    {
      label: "vs. manual VLOOKUP baseline",
      value: `${summary.baseline_manual_match_rate_pct}%`,
    },
    {
      label: "GST ITC claimable",
      value: `₹${summary.gst_itc_claimable.toLocaleString("en-IN")}`,
      tone: "text-stamp",
    },
    {
      label: "Money surfaced (duplicate + unexplained)",
      value: `₹${summary.money_surfaced_by_agent.toLocaleString("en-IN")}`,
      tone: "text-stamp",
    },
    {
      label: "Exceptions reasoned by AI",
      value: `${summary.ai_reasoned_count} of ${summary.total_exceptions}`,
      tone: "text-stamp",
    },
    {
      label: "Still needs human review",
      value: `${summary.unresolved_exceptions}`,
      tone: summary.unresolved_exceptions > 0 ? "text-brick" : "text-sage",
    },
  ];

  return (
    <div className="hover-glow bg-ink-800 border border-ink-700 rounded-sm px-5 py-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline gap-2 py-2.5 border-b border-ink-700/60 last:border-0"
        >
          <span className="text-[13px] text-text-dim whitespace-nowrap">{r.label}</span>
          <span className="flex-1 border-b border-dotted border-ink-600 translate-y-[-3px]" />
          <span className={`font-mono text-[14px] font-semibold whitespace-nowrap ${r.tone ?? "text-text"}`}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
