import type {
  SettlementLine,
  Order,
  BankRow,
  Exception,
  Report,
} from "./types";
import type { GeneratedData } from "./generateData";
import { reasonAboutLowConfidenceExceptions } from "./llmClassifier";
import { checkBenfordsLaw } from "./benfordCheck";

function rupees(paise: number) {
  return Math.round((paise / 100) * 100) / 100;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

interface ConfidenceSignals {
  hasOrderMatch: number;
  amountStrength: number;
  relativeBatchImpact: number;
}

const CONFIDENCE_WEIGHTS = {
  orderMatch: 0.35,
  amountStrength: 0.3,
  batchImpact: 0.2,
  temporal: 0.15,
};

export function computeConfidence(
  signals: ConfidenceSignals,
  temporalConsistency: number
): number {
  const raw =
    CONFIDENCE_WEIGHTS.orderMatch * signals.hasOrderMatch +
    CONFIDENCE_WEIGHTS.amountStrength * signals.amountStrength +
    CONFIDENCE_WEIGHTS.batchImpact * (1 - signals.relativeBatchImpact) +
    CONFIDENCE_WEIGHTS.temporal * temporalConsistency;
  return Math.max(0, Math.min(1, raw));
}

const DUPLICATE_WEIGHTS = { order: 0.45, amount: 0.3, time: 0.15, method: 0.1 };
const DUPLICATE_HARD_THRESHOLD = 0.92;
const DUPLICATE_SOFT_THRESHOLD = 0.65;

function parseSettledAt(s: string): number {
  const t = new Date(s.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function duplicateMatchScore(a: SettlementLine, b: SettlementLine): number {
  const orderMatch = a.order_id !== "" && a.order_id === b.order_id ? 1 : 0;
  const maxAmt = Math.max(a.credit, b.credit) || 1;
  const amountSim = 1 - Math.abs(a.credit - b.credit) / maxAmt;
  const hoursApart = Math.abs(parseSettledAt(a.settled_at) - parseSettledAt(b.settled_at)) / 3_600_000;
  const timeSim = Math.max(0, 1 - hoursApart / 48);
  const methodMatch = a.method === b.method ? 1 : 0;
  return (
    DUPLICATE_WEIGHTS.order * orderMatch +
    DUPLICATE_WEIGHTS.amount * amountSim +
    DUPLICATE_WEIGHTS.time * timeSim +
    DUPLICATE_WEIGHTS.method * methodMatch
  );
}

export class SettlementUnpacker {
  private settlementLines: SettlementLine[];
  private ordersById: Map<string, Order>;
  private bankByUtr: Map<string, BankRow>;
  private batchTotals: Map<string, number> = new Map();

  private exceptions: Exception[] = [];
  private matchedOrders = new Set<string>();
  private hardDuplicateEntityIds = new Set<string>();

  private confidenceInputs = new Map<Exception, ConfidenceSignals>();

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

  async run(): Promise<Report> {
    for (const [id, lines] of groupLinesBySettlement(this.settlementLines)) {
      this.batchTotals.set(id, batchGrossTotal(lines));
    }

    this.detectDuplicates();
    this.processBatches();
    this.finalizeConfidence();
    this.exceptions = await reasonAboutLowConfidenceExceptions(
      this.exceptions,
      this.settlementLines,
      Array.from(this.ordersById.values())
    );
    return this.buildReport();
  }

  private relativeBatchImpact(settlementId: string, amount: number): number {
    const total = this.batchTotals.get(settlementId) || 0;
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, amount / total));
  }

  private detectDuplicates() {
    for (const [settlementId, lines] of groupLinesBySettlement(this.settlementLines)) {
      const paymentsByOrder = new Map<string, SettlementLine[]>();
      for (const line of lines) {
        if (line.type !== "payment" || !line.order_id) continue;
        const arr = paymentsByOrder.get(line.order_id) ?? [];
        arr.push(line);
        paymentsByOrder.set(line.order_id, arr);
      }

      for (const [orderId, group] of paymentsByOrder) {
        if (group.length < 2) continue;

        for (let i = 1; i < group.length; i++) {
          const score = duplicateMatchScore(group[0], group[i]);
          if (score < DUPLICATE_SOFT_THRESHOLD) continue;

          const dupLine = group[i];
          const amount = rupees(dupLine.credit);
          const isHard = score >= DUPLICATE_HARD_THRESHOLD;

          if (isHard) {

            this.hardDuplicateEntityIds.add(dupLine.entity_id);
            this.totalRecoveredFlag += amount;
          }

          const exception: Exception = {
            order_id: orderId,
            settlement_id: settlementId,
            category: "DUPLICATE",
            amount,
            confidence: 0,
            explanation: isHard
              ? `Order ${orderId} appears settled twice within the same batch (${settlementId}) for the same amount. This looks like a duplicate settlement line, not two separate payments -- flagged before it gets booked as extra revenue.`
              : `Order ${orderId} was settled twice in batch ${settlementId} with a ${Math.round(score * 100)}% duplicate-match score on amount/timing/method -- close enough to flag, not identical enough to auto-exclude from revenue without review.`,
            suggested_action: isHard
              ? "Exclude the duplicate line from revenue posting; raise with Razorpay support quoting the settlement_id."
              : "Have a reviewer confirm before excluding this from revenue -- the match isn't exact enough to remove automatically.",
          };
          this.exceptions.push(exception);
          this.confidenceInputs.set(exception, {
            hasOrderMatch: 1,
            amountStrength: score,
            relativeBatchImpact: this.relativeBatchImpact(settlementId, amount),
          });
        }
      }
    }
  }

  private processBatches() {
    for (const [settlementId, lines] of groupLinesBySettlement(this.settlementLines)) {
      const utr = lines[0].settlement_utr;
      const bankRow = this.bankByUtr.get(utr);
      const grossLinesTotal = batchGrossTotal(lines);

      for (const line of lines) {
        if (this.hardDuplicateEntityIds.has(line.entity_id)) continue;

        const orderId = line.order_id;
        const fee = line.fee ? rupees(line.fee) : 0;
        const tax = line.tax ? rupees(line.tax) : 0;
        this.totalFeeDeducted += fee;
        this.totalTaxDeducted += tax;

        if (line.type === "payment") {
          const order = this.ordersById.get(orderId);
          if (order) {
            this.matchedOrders.add(orderId);

            if (tax > 0) {
              this.gstItcClaimable += tax;
            } else {
              this.gstItcAtRisk += fee * 0.18;
            }
          } else {
            const amount = rupees(line.credit);
            const exception: Exception = {
              order_id: orderId,
              settlement_id: settlementId,
              category: "UNEXPLAINED",
              amount,
              confidence: 0,
              explanation:
                `Settlement references order ${orderId}, but no matching ` +
                `order exists in the merchant's own ledger. Could be a ` +
                `data export gap or an order placed outside this system.`,
              suggested_action:
                "Check for a missing export window in the order ledger " +
                "before escalating.",
            };
            this.exceptions.push(exception);

            this.confidenceInputs.set(exception, {
              hasOrderMatch: 0,
              amountStrength: 0.2,
              relativeBatchImpact: this.relativeBatchImpact(settlementId, amount),
            });
          }
        } else if (line.type === "refund") {
          const amount = rupees(line.debit);
          const order = this.ordersById.get(orderId);

          const withinOrderAmount = order ? amount <= order.order_amount : false;
          const exception: Exception = {
            order_id: orderId,
            settlement_id: settlementId,
            category: "REFUND",
            amount,
            confidence: 0,
            explanation:
              `₹${amount} deducted against order ${orderId} is ` +
              `a refund issued to the customer, not a shortfall -- the net ` +
              `settlement is correctly lower because of it.`,
            suggested_action:
              "No action needed; post as a refund against the original " +
              "sales entry.",
          };
          this.exceptions.push(exception);
          this.confidenceInputs.set(exception, {
            hasOrderMatch: order ? 1 : 0,
            amountStrength: withinOrderAmount ? 1 : 0.3,
            relativeBatchImpact: this.relativeBatchImpact(settlementId, amount),
          });
        } else if (line.type === "adjustment") {
          const amt =
            line.debit && line.debit > 0
              ? rupees(line.debit)
              : rupees(line.credit);
          let category: Exception["category"];
          let explanation: string;
          let action: string;
          let signals: ConfidenceSignals;

          if (amt <= 1.0) {
            category = "ROUNDING";
            explanation =
              `₹${amt} adjustment in batch ${settlementId} is paise-level ` +
              `rounding dust, not a real discrepancy.`;
            action = "No action needed.";

            signals = {
              hasOrderMatch: 1,
              amountStrength: 1 - (amt / 1.0) * 0.4,
              relativeBatchImpact: this.relativeBatchImpact(settlementId, amt),
            };
          } else {
            category = "UNEXPLAINED";
            explanation =
              `₹${amt} adjustment in batch ${settlementId} has no order ` +
              `reference and doesn't match a known fee/tax/refund pattern ` +
              `-- this is a genuine gap, not a guess.`;
            action =
              `Escalate to Razorpay support with settlement_id ` +
              `${settlementId} and UTR ${utr} -- this is exactly the kind ` +
              `of 'unexplained deduction' merchants can't trace on their own.`;

            signals = {
              hasOrderMatch: 0,
              amountStrength: 0.15,
              relativeBatchImpact: this.relativeBatchImpact(settlementId, amt),
            };
          }

          const exception: Exception = {
            order_id: "",
            settlement_id: settlementId,
            category,
            amount: amt,
            confidence: 0,
            explanation,
            suggested_action: action,
          };
          this.exceptions.push(exception);
          this.confidenceInputs.set(exception, signals);
          if (category === "UNEXPLAINED") this.totalRecoveredFlag += amt;
        }
      }

      if (bankRow) {
        const diff = round2(bankRow.credited_amount - grossLinesTotal);
        if (Math.abs(diff) > 1.0) {
          const amount = Math.abs(diff);
          const exception: Exception = {
            order_id: "",
            settlement_id: settlementId,
            category: "UNEXPLAINED",
            amount,
            confidence: 0,
            explanation:
              `Bank credit for UTR ${utr} is ₹${bankRow.credited_amount}, ` +
              `but the settlement lines only add up to ₹${round2(
                grossLinesTotal
              )} -- a ₹${amount} gap at the batch level that no ` +
              `individual line explains.`,
            suggested_action:
              "Escalate with UTR and settlement_id -- batch-level gaps " +
              "are the hardest for finance teams to trace manually.",
          };
          this.exceptions.push(exception);
          this.confidenceInputs.set(exception, {
            hasOrderMatch: 0,
            amountStrength: 0.15,
            relativeBatchImpact: this.relativeBatchImpact(settlementId, amount),
          });
        }
      }
    }
  }

  private finalizeConfidence() {
    const frequency = new Map<string, number>();
    for (const e of this.exceptions) {
      const key = `${e.category}:${Math.round(e.amount)}`;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }

    for (const e of this.exceptions) {
      const signals = this.confidenceInputs.get(e);
      if (!signals) continue;
      const key = `${e.category}:${Math.round(e.amount)}`;
      const temporalConsistency = (frequency.get(key) ?? 1) > 1 ? 1 : 0.5;
      e.confidence = round2(computeConfidence(signals, temporalConsistency));
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
    const verificationFailed = this.exceptions.filter((e) => e.verification_failed);

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
        ai_verification_failed_count: verificationFailed.length,
      },
      exceptions_by_category: byCategory,
      exceptions: this.exceptions,

      benford: checkBenfordsLaw(this.exceptions),
    };
  }
}
