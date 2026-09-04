import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/requireUser";
import { getOrCreateLatestRun } from "@/lib/db/runs";
import { buildBatchSummaries } from "@/lib/batchSummary";
import { SettlementTrendChart } from "@/components/charts/SettlementTrendChart";
import { BatchTable } from "@/components/settlements/BatchTable";

export const metadata: Metadata = { title: "Settlements · Unsettle" };

export default async function SettlementsPage() {
  const user = await requireUser();
  const { report, data } = await getOrCreateLatestRun(user.id);
  const batches = buildBatchSummaries(data, report.exceptions);

  const totalCredited = batches.reduce((sum, b) => sum + b.credited_amount, 0);
  const gapCount = batches.filter((b) => Math.abs(b.diff) >= 1).length;

  return (
    <div className="fade-in-up">
      <header className="mb-8">
        <div className="font-mono text-[11px] tracking-widest text-stamp uppercase mb-3">
          Settlements
        </div>
        <h1 className="font-display text-4xl font-normal tracking-tight mb-3 text-text">
          Batch-level view
        </h1>
        <p className="text-text-dim text-[15px] max-w-lg leading-relaxed">
          Every settlement batch the bank sent, next to what the individual
          order-level lines actually add up to.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-px bg-ink-700 mb-10 rounded-sm overflow-hidden">
        <div className="bg-ink-800 px-4 py-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-text-dim mb-1">Batches</div>
          <div className="font-mono text-lg font-semibold text-text">{batches.length}</div>
        </div>
        <div className="bg-ink-800 px-4 py-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-text-dim mb-1">Total credited</div>
          <div className="font-mono text-lg font-semibold text-text">
            ₹{Math.round(totalCredited).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-ink-800 px-4 py-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wide text-text-dim mb-1">Batches with a gap</div>
          <div className={`font-mono text-lg font-semibold ${gapCount > 0 ? "text-brick" : "text-sage"}`}>
            {gapCount}
          </div>
        </div>
      </div>

      <section className="mb-11">
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Bank credit over time
        </h2>
        <div className="hover-glow rounded-sm border border-ink-700 bg-ink-800 px-5 py-4">
          <SettlementTrendChart batches={batches} />
        </div>
      </section>

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          All batches
        </h2>
        <BatchTable batches={batches} />
      </section>
    </div>
  );
}
