import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/requireUser";
import { getOrCreateLatestRun } from "@/lib/db/runs";
import { GstMeter } from "@/components/charts/GstMeter";

export const metadata: Metadata = { title: "Tax & GST · Unsettle" };

export default async function TaxPage() {
  const user = await requireUser();
  const { report } = await getOrCreateLatestRun(user.id);
  const { summary } = report;

  return (
    <div className="fade-in-up">
      <header className="mb-8">
        <div className="font-mono text-[12.5px] tracking-widest text-stamp uppercase mb-3">
          Tax & GST
        </div>
        <h1 className="font-display text-4xl font-normal tracking-tight mb-3 text-text">
          Input tax credit
        </h1>
        <p className="text-text-dim text-[17px] max-w-lg leading-relaxed">
          GST charged on Razorpay&apos;s MDR fee is only claimable as input tax
          credit when it&apos;s itemised as its own settlement line — this is
          exactly where merchants lose money when a settlement feed doesn&apos;t
          break it out.
        </p>
      </header>

      <section className="mb-11">
        <div className="font-mono text-[12.5px] uppercase tracking-wide text-text-dim mb-1">
          Total tax deducted across all settlements
        </div>
        <div className="font-sans text-5xl font-semibold text-text tabular-nums">
          ₹{summary.total_tax_deducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
      </section>

      <section className="mb-11">
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Claimable vs. at risk
        </h2>
        <GstMeter claimable={summary.gst_itc_claimable} atRisk={summary.gst_itc_at_risk} />
        <p className="font-mono text-[12.5px] text-text-dim mt-3">
          &quot;At risk&quot; assumes the standard 18% GST rate on fee lines that
          didn&apos;t itemise tax separately — a conservative estimate, not a
          guaranteed loss.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Numbers
        </h2>
        <div className="bg-ink-800 border border-ink-700 rounded-sm px-5 py-2">
          {[
            { label: "MDR fee deducted", value: summary.total_fee_deducted },
            { label: "Tax on fee (total)", value: summary.total_tax_deducted },
            { label: "GST ITC claimable", value: summary.gst_itc_claimable },
            { label: "GST ITC at risk", value: summary.gst_itc_at_risk },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-baseline gap-2 py-2.5 border-b border-ink-700/60 last:border-0"
            >
              <span className="text-[14.5px] text-text-dim whitespace-nowrap">{row.label}</span>
              <span className="flex-1 border-b border-dotted border-ink-600 translate-y-[-3px]" />
              <span className="font-mono text-[16px] font-semibold whitespace-nowrap text-text">
                ₹{row.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
