import { describe, it, expect } from "vitest";
import { SettlementUnpacker } from "../reconcile";
import type { Order, SettlementLine, BankRow } from "../types";
import type { GeneratedData } from "../generateData";

// Vitest doesn't load .env.local (that's Next.js-specific), so
// OPENROUTER_API_KEY is unset here by default -- every low-confidence
// exception below goes through the real reasonAboutLowConfidenceExceptions()
// call, hits LLMNotConfiguredError immediately (no network call, no
// flakiness), and falls back to its rule-based classification unchanged.
// That's exactly the behavior these tests are checking, not a workaround.

function order(id: string, amount: number): Order {
  return {
    order_id: id,
    payment_id: `pay_${id}`,
    order_amount: amount,
    method: "upi",
    created_at: "2026-08-01 10:00",
    status: "paid",
  };
}

function paymentLine(opts: {
  orderId: string;
  creditRupees: number;
  settlementId?: string;
  utr?: string;
  entityId?: string;
  feeRupees?: number;
  taxRupees?: number;
  settledAt?: string;
  method?: string;
}): SettlementLine {
  return {
    entity_id: opts.entityId ?? `pay_${opts.orderId}`,
    type: "payment",
    debit: 0,
    credit: Math.round(opts.creditRupees * 100),
    amount: Math.round(opts.creditRupees * 100),
    fee: Math.round((opts.feeRupees ?? 0) * 100),
    tax: Math.round((opts.taxRupees ?? 0) * 100),
    settlement_id: opts.settlementId ?? "setl_test",
    settlement_utr: opts.utr ?? "UTR_TEST",
    order_id: opts.orderId,
    method: opts.method ?? "upi",
    card_network: "",
    settled_at: opts.settledAt ?? "2026-08-02 10:00",
  };
}

function refundLine(opts: {
  orderId: string;
  debitRupees: number;
  settlementId?: string;
  utr?: string;
}): SettlementLine {
  return {
    entity_id: `rfnd_${opts.orderId}`,
    type: "refund",
    debit: Math.round(opts.debitRupees * 100),
    credit: 0,
    amount: Math.round(opts.debitRupees * 100),
    fee: 0,
    tax: 0,
    settlement_id: opts.settlementId ?? "setl_test",
    settlement_utr: opts.utr ?? "UTR_TEST",
    order_id: opts.orderId,
    method: "refund",
    card_network: "",
    settled_at: "2026-08-02 10:00",
  };
}

function adjustmentLine(opts: {
  debitRupees: number;
  settlementId?: string;
  utr?: string;
}): SettlementLine {
  return {
    entity_id: `adj_${Math.random().toString(36).slice(2)}`,
    type: "adjustment",
    debit: Math.round(opts.debitRupees * 100),
    credit: 0,
    amount: Math.round(opts.debitRupees * 100),
    fee: 0,
    tax: 0,
    settlement_id: opts.settlementId ?? "setl_test",
    settlement_utr: opts.utr ?? "UTR_TEST",
    order_id: "",
    method: "",
    card_network: "",
    settled_at: "2026-08-02 10:00",
  };
}

function bankRow(utr: string, creditedAmount: number): BankRow {
  return { bank_txn_id: `bnk_${utr}`, utr, credited_amount: creditedAmount, value_date: "2026-08-02" };
}

describe("SettlementUnpacker", () => {
  it("catches an exact-fingerprint duplicate as DUPLICATE, high confidence", async () => {
    const orderA = order("order_A", 1000);
    const lineA1 = paymentLine({ orderId: "order_A", creditRupees: 10, entityId: "pay_A1" });
    const lineA2 = paymentLine({ orderId: "order_A", creditRupees: 10, entityId: "pay_A2" }); // exact duplicate

    const data: GeneratedData = {
      orders: [orderA],
      settlementLines: [lineA1, lineA2],
      bankRows: [bankRow("UTR_TEST", 20)], // bank genuinely received both credits
    };

    const report = await new SettlementUnpacker(data).run();
    const duplicates = report.exceptions.filter((e) => e.category === "DUPLICATE");

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].confidence).toBeGreaterThan(0.6);
  });

  it("classifies a refund against a real order as REFUND, high confidence", async () => {
    const o = order("order_R", 1000);
    const payment = paymentLine({ orderId: "order_R", creditRupees: 9, feeRupees: 0.8, taxRupees: 0.14 });
    const refund = refundLine({ orderId: "order_R", debitRupees: 3 });

    const data: GeneratedData = {
      orders: [o],
      settlementLines: [payment, refund],
      bankRows: [bankRow("UTR_TEST", 6)], // 9 credited, 3 refunded out
    };

    const report = await new SettlementUnpacker(data).run();
    const refunds = report.exceptions.filter((e) => e.category === "REFUND");

    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBeCloseTo(3, 2);
    expect(refunds[0].confidence).toBeGreaterThan(0.6);
  });

  it("classifies a sub-rupee adjustment as ROUNDING", async () => {
    const o = order("order_D", 1000);
    const payment = paymentLine({ orderId: "order_D", creditRupees: 9.7 });
    const dust = adjustmentLine({ debitRupees: 0.3 });

    const data: GeneratedData = {
      orders: [o],
      settlementLines: [payment, dust],
      bankRows: [bankRow("UTR_TEST", 9.4)],
    };

    const report = await new SettlementUnpacker(data).run();
    const rounding = report.exceptions.filter((e) => e.category === "ROUNDING");

    expect(rounding).toHaveLength(1);
    expect(rounding[0].amount).toBeCloseTo(0.3, 2);
  });

  // Regression test for the "double-flagging the same rupee" bug (see
  // README "What broke, and how we got out" #1): a detected duplicate was
  // ALSO flagged as a separate batch-level UNEXPLAINED gap, because the
  // batch check compared the bank credit against a total that had already
  // excluded the duplicate. The fix sums ALL lines (the bank genuinely
  // received that money) for the batch-level check.
  it("does not also flag a detected duplicate as a separate batch-level gap", async () => {
    const orderA = order("order_A", 1000);
    const orderB = order("order_B", 2000);
    const lineA1 = paymentLine({ orderId: "order_A", creditRupees: 10, entityId: "pay_A1" });
    const lineA2 = paymentLine({ orderId: "order_A", creditRupees: 10, entityId: "pay_A2" }); // exact duplicate
    const lineB = paymentLine({ orderId: "order_B", creditRupees: 20, entityId: "pay_B" });

    const data: GeneratedData = {
      orders: [orderA, orderB],
      settlementLines: [lineA1, lineA2, lineB],
      // Bank genuinely received all three credits: 10 + 10 + 20 = 40.
      bankRows: [bankRow("UTR_TEST", 40)],
    };

    const report = await new SettlementUnpacker(data).run();

    const duplicates = report.exceptions.filter((e) => e.category === "DUPLICATE");
    const unexplained = report.exceptions.filter((e) => e.category === "UNEXPLAINED");

    expect(duplicates).toHaveLength(1);
    // The bug would have produced a spurious UNEXPLAINED batch-level gap
    // here too, double-counting the same ₹10.
    expect(unexplained).toHaveLength(0);
  });

  it("computes match rate correctly against a small hand-built fixture", async () => {
    // 3 orders: two settle normally, one is still pending (never appears in
    // settlementLines) -- so 2/3 matched, an unambiguous, eyeball-verifiable
    // expected answer.
    const matched1 = order("order_1", 500);
    const matched2 = order("order_2", 700);
    const pending = order("order_3", 300);

    const data: GeneratedData = {
      orders: [matched1, matched2, pending],
      settlementLines: [
        paymentLine({ orderId: "order_1", creditRupees: 490 }),
        paymentLine({ orderId: "order_2", creditRupees: 686 }),
      ],
      bankRows: [bankRow("UTR_TEST", 490 + 686)],
    };

    const report = await new SettlementUnpacker(data).run();

    expect(report.summary.total_orders).toBe(3);
    expect(report.summary.matched_orders).toBe(2);
    expect(report.summary.match_rate_pct).toBeCloseTo((2 / 3) * 100, 1);
  });
});
