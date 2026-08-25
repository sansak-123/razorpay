import type { BatchSummary } from "@/lib/batchSummary";
import { BatchDumbbellChart } from "@/components/charts/BatchDumbbellChart";

// The table-view twin for SettlementTrendChart, and the place the per-batch
// dumbbell mark (bank credit vs. lines total) actually lives.
export function BatchTable({ batches }: { batches: BatchSummary[] }) {
  const domainMax = Math.max(
    ...batches.map((b) => Math.max(b.credited_amount, b.lines_total)),
    1
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-text-dim border-b border-ink-700">
            <th className="py-2 pr-3 font-normal">Batch</th>
            <th className="py-2 pr-3 font-normal">Date</th>
            <th className="py-2 pr-3 font-normal">Orders</th>
            <th className="py-2 pr-3 font-normal">Bank credit vs. lines total</th>
            <th className="py-2 pr-3 font-normal text-right">Diff</th>
            <th className="py-2 pr-0 font-normal text-right">Exceptions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const matched = Math.abs(b.diff) < 1;
            return (
              <tr
                key={b.settlement_id}
                className="hover-glow border-b border-ink-700/60 last:border-0"
              >
                <td className="py-3 pr-3 font-mono text-[11.5px] text-text-dim">
                  {b.settlement_id.slice(0, 14)}…
                  <div className="text-[10px] text-text-dim/60">UTR {b.utr}</div>
                </td>
                <td className="py-3 pr-3 font-mono text-text-dim">{b.value_date}</td>
                <td className="py-3 pr-3 font-mono text-text">{b.order_count}</td>
                <td className="py-3 pr-3">
                  <BatchDumbbellChart
                    credited={b.credited_amount}
                    linesTotal={b.lines_total}
                    domainMax={domainMax}
                  />
                </td>
                <td
                  className={`py-3 pr-3 text-right font-mono ${matched ? "text-sage" : "text-brick"}`}
                >
                  {matched ? "matched" : `₹${Math.abs(b.diff).toLocaleString("en-IN")}`}
                </td>
                <td className="py-3 pr-0 text-right font-mono text-text-dim">
                  {b.exception_count > 0
                    ? `${b.exception_count} · ₹${b.exception_amount.toLocaleString("en-IN")}`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
