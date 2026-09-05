import type { Report } from "@/lib/types";

export function HeroReceipt({ report }: { report: Report }) {
  const { summary } = report;
  const lumpSum =
    summary.total_fee_deducted +
    summary.total_tax_deducted +
    summary.gst_itc_claimable +

    summary.matched_orders * 1200;

  const stubs = [
    { label: "Order credits", value: summary.matched_orders * 1200 - summary.total_fee_deducted - summary.total_tax_deducted, tone: "sage" },
    { label: "MDR fee", value: summary.total_fee_deducted, tone: "stamp" },
    { label: "GST on fee", value: summary.total_tax_deducted, tone: "stamp" },
    { label: "Flagged", value: summary.money_surfaced_by_agent, tone: "brick" },
  ];

  const toneClass: Record<string, string> = {
    sage: "text-sage border-sage/40",
    stamp: "text-stamp border-stamp/40",
    brick: "text-brick border-brick/40",
  };

  return (
    <div className="mb-4">

      <div className="torn-edge-bottom bg-paper text-ink-900 rounded-t-sm px-6 pt-5 pb-8 relative overflow-hidden">
        <div
          className="absolute top-3 right-4 border-2 border-brick text-brick text-[11.5px] font-mono font-bold uppercase tracking-widest px-2 py-1 stamp-in"
          style={{ ["--stamp-rot" as string]: "8deg", transform: "rotate(8deg)" }}
        >
          Unlinked
        </div>
        <div className="font-mono text-[12.5px] uppercase tracking-widest text-ink-900/60 mb-1">
          Settlement credit · one bank line
        </div>
        <div className="font-display text-4xl md:text-5xl font-normal tracking-tight">
          ₹{Math.round(lumpSum).toLocaleString("en-IN")}
        </div>
        <div className="font-mono text-[12.5px] text-ink-900/50 mt-1">
          covers {summary.total_orders} orders · no breakdown, no order references
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink-700">
        {stubs.map((s) => (
          <div key={s.label} className="bg-ink-800 px-4 py-3.5">
            <div className="font-mono text-[11.5px] uppercase tracking-wide text-text-dim mb-1">
              {s.label}
            </div>
            <div
              className={`font-mono text-lg font-semibold border-b-2 pb-0.5 inline-block ${toneClass[s.tone]}`}
            >
              ₹{Math.round(Math.abs(s.value)).toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
      <p className="font-mono text-[12.5px] text-text-dim mt-3 text-center">
        ↑ this is what the bank shows you. everything below is what actually happened.
      </p>
    </div>
  );
}
