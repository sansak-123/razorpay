import type {
  SettlementLine,
  Order,
  BankRow,
  Exception,
  Report,
} from "./types";
import type { GeneratedData } from "./generateData";
import { reasonAboutLowConfidenceExceptions } from "./llmClassifier";

function rupees(paise: number) {
  return Math.round((paise / 100) * 100) / 100;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Exported so batchSummary.ts (the Settlements page's per-batch derivation)
// reuses the exact same grouping/arithmetic instead of re-deriving it and
// risking drift from what the reconciliation engine actually computed.
export function groupLinesBySettlement(
  lines: SettlementLine[]
): Map<string, SettlementLine[]> {
  const batches = new Map<string, SettlementLine[]>();
  for (const line of lines) {
    const arr = batches.get(line.settlement_id) ?? [];
    arr.push(line);
    batches.set(line.settlement_id, arr);
  }
  return batches;
}

export function batchGrossTotal(lines: SettlementLine[]): number {
  return lines.reduce((sum, l) => sum + rupees(l.credit) - rupees(l.debit), 0);
}

// This class mirrors the Python SettlementUnpacker class one-to-one. Classes
// in TypeScript work the same way they do in Python: `this` refers to the
// current instance, and every method can read/write the fields declared
// below it. Grouping state (exceptions, running totals) as fields instead of
// passing them between free functions keeps the multi-step algorithm
// (detect duplicates -> process batches -> build report) readable as a
// sequence of steps that share context.
export class SettlementUnpacker {
  private settlementLines: SettlementLine[];
  private ordersById: Map<string, Order>;
  private bankByUtr: Map<string, BankRow>;

  private exceptions: Exception[] = [];
  private matchedOrders = new Set<string>();
  private duplicateEntityIds = new Set<string>();

  private gstItcClaimable = 0;
  private gstItcAtRisk = 0;
  private totalFeeDeducted = 0;
  private totalTaxDeducted = 0;
  private totalRecoveredFlag = 0;

  constructor(data: GeneratedData) {
    this.settlementLines = data.settlementLines;
    this.ordersById = new Map(data.orders.map((o) => [o.order_id, o]));
    this.bankByUtr = new Map(data.bankRows.map((b) => [b.utr, b]));
  }

  // run() is async now specifically because of this step: after the
  // deterministic rules have done everything they confidently can, every
  // exception the rules were genuinely unsure about (confidence < 0.6) gets
  // sent to Claude for real reasoning over the batch context, and the
  // result REPLACES the rule-based guess in place. This is the actual "AI
  // judgment" layer -- everything above it is fast, deterministic matching;
  // this step is where the agent looks at an ambiguous case the way a
  // human reviewer would, weighing multiple weak signals together instead
  // of applying one fixed threshold.
  async run(): Promise<Report> {
    this.detectDuplicates();
    this.processBatches();
    this.exceptions = await reasonAboutLowConfidenceExceptions(
      this.exceptions,
      this.settlementLines,
      Array.from(this.ordersById.values())
    );
    return this.buildReport();
  }

  // Two settlement lines with the same order_id + credit amount + batch is a
  // duplicate settlement -- flagged BEFORE processing, so later steps can
  // simply skip these lines rather than re-deriving the same logic twice.
  private detectDuplicates() {
    const seen = new Map<string, string>();
    for (const line of this.settlementLines) {
      if (line.type !== "payment") continue;
      const key = `${line.order_id}|${line.credit}|${line.settlement_id}`;
      if (seen.has(key)) {
        this.duplicateEntityIds.add(line.entity_id);
        const dupAmount = rupees(line.credit);
        this.totalRecoveredFlag += dupAmount;
        this.exceptions.push({
          order_id: line.order_id,
          settlement_id: line.settlement_id,
          category: "DUPLICATE",
          amount: dupAmount,
          confidence: 0.97,
          explanation:
            `Order ${line.order_id} appears settled twice within the same ` +
            `batch (${line.settlement_id}) for the same amount. This looks ` +
            `like a duplicate settlement line, not two separate payments -- ` +
            `flagged before it gets booked as extra revenue.`,
          suggested_action:
            "Exclude the duplicate line from revenue posting; raise with " +
            "Razorpay support quoting the settlement_id.",
        });
      } else {
        seen.set(key, line.entity_id);
      }
    }
  }

  private processBatches() {
    // JS objects/Maps preserve insertion order, so grouping into a Map here
    // gives deterministic batch ordering -- same as Python's
    // collections.defaultdict(list) on a dict, which is insertion-ordered
    // since Python 3.7.
    const batches = groupLinesBySettlement(this.settlementLines);

    for (const [settlementId, lines] of batches.entries()) {
      const utr = lines[0].settlement_utr;
      const bankRow = this.bankByUtr.get(utr);

      const grossLinesTotal = batchGrossTotal(lines);

      for (const line of lines) {
        if (this.duplicateEntityIds.has(line.entity_id)) continue;

        const orderId = line.order_id;
        const fee = line.fee ? rupees(line.fee) : 0;
        const tax = line.tax ? rupees(line.tax) : 0;
        this.totalFeeDeducted += fee;
        this.totalTaxDeducted += tax;

        if (line.type === "payment") {
          const order = this.ordersById.get(orderId);
          if (order) {
            this.matchedOrders.add(orderId);
            // GST on the MDR fee is only claimable as input tax credit if
            // it's broken out as its own line item. Here it is (line.tax),
            // so it's claimable -- this is exactly where real merchants
            // lose money when a settlement feed doesn't itemise it.
            if (tax > 0) {
              this.gstItcClaimable += tax;
            } else {
              this.gstItcAtRisk += fee * 0.18;
            }
          } else {
            this.exceptions.push({
              order_id: orderId,
              settlement_id: settlementId,
              category: "UNEXPLAINED",
              amount: rupees(line.credit),
              confidence: 0.4,
              explanation:
                `Settlement references order ${orderId}, but no matching ` +
                `order exists in the merchant's own ledger. Could be a ` +
                `data export gap or an order placed outside this system.`,
              suggested_action:
                "Check for a missing export window in the order ledger " +
                "before escalating.",
            });
          }
        } else if (line.type === "refund") {
          this.exceptions.push({
            order_id: orderId,
            settlement_id: settlementId,
            category: "REFUND",
            amount: rupees(line.debit),
            confidence: 0.95,
            explanation:
              `₹${rupees(line.debit)} deducted against order ${orderId} is ` +
              `a refund issued to the customer, not a shortfall -- the net ` +
              `settlement is correctly lower because of it.`,
            suggested_action:
              "No action needed; post as a refund against the original " +
              "sales entry.",
          });
        } else if (line.type === "adjustment") {
          const amt =
            line.debit && line.debit > 0
              ? rupees(line.debit)
              : rupees(line.credit);
          let category: Exception["category"];
          let confidence: number;
          let explanation: string;
          let action: string;
          if (amt <= 1.0) {
            category = "ROUNDING";
            confidence = 0.9;
            explanation =
              `₹${amt} adjustment in batch ${settlementId} is paise-level ` +
              `rounding dust, not a real discrepancy.`;
            action = "No action needed.";
          } else {
            category = "UNEXPLAINED";
            confidence = 0.3;
            explanation =
              `₹${amt} adjustment in batch ${settlementId} has no order ` +
              `reference and doesn't match a known fee/tax/refund pattern ` +
              `-- this is a genuine gap, not a guess.`;
            action =
              `Escalate to Razorpay support with settlement_id ` +
              `${settlementId} and UTR ${utr} -- this is exactly the kind ` +
              `of 'unexplained deduction' merchants can't trace on their own.`;
          }
          this.exceptions.push({
            order_id: "",
            settlement_id: settlementId,
            category,
            amount: amt,
            confidence,
            explanation,
            suggested_action: action,
          });
          if (category === "UNEXPLAINED") this.totalRecoveredFlag += amt;
        }
      }

      // Batch-level check: sum ALL lines (duplicates included, since the
      // bank genuinely received that money too) and compare to the actual
      // bank credit. Only flag a NEW gap if one remains after the
      // duplicate is already explained above -- see README "what broke".
      if (bankRow) {
        const diff = round2(bankRow.credited_amount - grossLinesTotal);
        if (Math.abs(diff) > 1.0) {
          this.exceptions.push({
            order_id: "",
            settlement_id: settlementId,
            category: "UNEXPLAINED",
            amount: Math.abs(diff),
            confidence: 0.35,
            explanation:
              `Bank credit for UTR ${utr} is ₹${bankRow.credited_amount}, ` +
              `but the settlement lines only add up to ₹${round2(
                grossLinesTotal
              )} -- a ₹${Math.abs(diff)} gap at the batch level that no ` +
              `individual line explains.`,
            suggested_action:
              "Escalate with UTR and settlement_id -- batch-level gaps " +
              "are the hardest for finance teams to trace manually.",
          });
        }
      }
    }
  }

  private buildReport(): Report {
    const totalOrders = this.ordersById.size;
    const matched = this.matchedOrders.size;
    const matchRate = totalOrders
      ? round2((100 * matched) / totalOrders)
      : 0;

    const byCategory: Record<string, { count: number; amount: number }> = {};
    for (const e of this.exceptions) {
      const bucket = byCategory[e.category] ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount = round2(bucket.amount + e.amount);
      byCategory[e.category] = bucket;
    }

    const unresolved = this.exceptions.filter((e) => e.confidence < 0.6);
    const aiReasoned = this.exceptions.filter((e) => e.ai_reasoned);

    return {
      summary: {
        total_orders: totalOrders,
        matched_orders: matched,
        match_rate_pct: matchRate,
        baseline_manual_match_rate_pct: 51.0,
        total_fee_deducted: round2(this.totalFeeDeducted),
        total_tax_deducted: round2(this.totalTaxDeducted),
        gst_itc_claimable: round2(this.gstItcClaimable),
        gst_itc_at_risk: round2(this.gstItcAtRisk),
        money_surfaced_by_agent: round2(this.totalRecoveredFlag),
        total_exceptions: this.exceptions.length,
        unresolved_exceptions: unresolved.length,
        ai_reasoned_count: aiReasoned.length,
      },
      exceptions_by_category: byCategory,
      exceptions: this.exceptions,
    };
  }
}
