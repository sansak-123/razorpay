import type { Exception } from "./types";
import type { GeneratedData } from "./generateData";
import { groupLinesBySettlement, batchGrossTotal } from "./reconcile";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface BatchSummary {
  settlement_id: string;
  utr: string;
  value_date: string;
  credited_amount: number;
  lines_total: number;
  diff: number;
  order_count: number;
  exception_count: number;
  exception_amount: number;
}

export function buildBatchSummaries(
  data: GeneratedData,
  exceptions: Exception[]
): BatchSummary[] {
  const bankByUtr = new Map(data.bankRows.map((b) => [b.utr, b]));
  const batches = groupLinesBySettlement(data.settlementLines);

  const exceptionsBySettlement = new Map<string, Exception[]>();
  for (const e of exceptions) {
    const arr = exceptionsBySettlement.get(e.settlement_id) ?? [];
    arr.push(e);
    exceptionsBySettlement.set(e.settlement_id, arr);
  }

  const summaries: BatchSummary[] = [];
  for (const [settlementId, lines] of batches.entries()) {
    const utr = lines[0].settlement_utr;
    const bankRow = bankByUtr.get(utr);
    const linesTotal = round2(batchGrossTotal(lines));
    const creditedAmount = bankRow ? round2(bankRow.credited_amount) : linesTotal;
    const linkedExceptions = exceptionsBySettlement.get(settlementId) ?? [];
    const orderIds = new Set(
      lines.filter((l) => l.type === "payment").map((l) => l.order_id)
    );

    summaries.push({
      settlement_id: settlementId,
      utr,
      value_date: bankRow?.value_date ?? lines[0].settled_at.split(" ")[0],
      credited_amount: creditedAmount,
      lines_total: linesTotal,
      diff: round2(creditedAmount - linesTotal),
      order_count: orderIds.size,
      exception_count: linkedExceptions.length,
      exception_amount: round2(
        linkedExceptions.reduce((sum, e) => sum + e.amount, 0)
      ),
    });
  }

  return summaries.sort((a, b) => a.value_date.localeCompare(b.value_date));
}
