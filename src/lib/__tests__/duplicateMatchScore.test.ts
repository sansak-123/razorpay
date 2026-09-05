import { describe, it, expect } from "vitest";
import { duplicateMatchScore, SettlementUnpacker } from "../reconcile";
import type { SettlementLine, Order } from "../types";
import type { GeneratedData } from "../generateData";

function line(overrides: Partial<SettlementLine>): SettlementLine {
  return {
    entity_id: "e1",
    type: "payment",
    debit: 0,
    credit: 1000,
    amount: 1000,
    fee: 0,
    tax: 0,
    settlement_id: "setl_1",
    settlement_utr: "UTR1",
    order_id: "order_X",
    method: "upi",
    card_network: "",
    settled_at: "2026-08-02 10:00",
    ...overrides,
  };
}

describe("duplicateMatchScore", () => {
  it("scores an exact duplicate above the hard (auto-exclude) threshold", () => {
    const a = line({ entity_id: "a" });
    const b = line({ entity_id: "b" }); // identical order/amount/time/method
    expect(duplicateMatchScore(a, b)).toBeGreaterThanOrEqual(0.92);
  });

  it("scores a 'soft' duplicate (same order, different amount/timing) in the flag-for-review band, not the hard band", () => {
    // Mirrors generateData.ts's own seeded soft-duplicate case: same order,
    // ~38% lower amount, settled ~40 hours later, same method. This is
    // exactly the case exact-fingerprint matching (the old implementation)
    // could never have caught -- neither the amount nor the timestamp
    // match.
    const a = line({ entity_id: "a", credit: 1000, settled_at: "2026-08-02 10:00" });
    const b = line({ entity_id: "b", credit: 620, settled_at: "2026-08-04 02:00" }); // +40h, 62% of original

    const score = duplicateMatchScore(a, b);
    expect(score).toBeGreaterThanOrEqual(0.65);
    expect(score).toBeLessThan(0.92);
  });

  it("scores unrelated orders low even with identical amount/time (order match dominates)", () => {
    const a = line({ entity_id: "a", order_id: "order_X" });
    const b = line({ entity_id: "b", order_id: "order_Y" });
    expect(duplicateMatchScore(a, b)).toBeLessThan(0.65);
  });
});

describe("SettlementUnpacker soft-duplicate handling", () => {
  it("flags a soft duplicate as DUPLICATE but does NOT auto-exclude it from revenue", async () => {
    const orderX: Order = {
      order_id: "order_X",
      payment_id: "pay_X",
      order_amount: 1000,
      method: "upi",
      created_at: "2026-08-01 10:00",
      status: "paid",
    };
    const primary = line({ entity_id: "pay_X1", credit: 1000, settled_at: "2026-08-02 10:00" });
    const softDup = line({ entity_id: "pay_X2", credit: 620, settled_at: "2026-08-04 02:00" });

    const data: GeneratedData = {
      orders: [orderX],
      settlementLines: [primary, softDup],
      bankRows: [
        {
          bank_txn_id: "bnk1",
          utr: "UTR1",
          credited_amount: (1000 + 620) / 100, // bank genuinely received both
          value_date: "2026-08-02",
        },
      ],
    };

    const report = await new SettlementUnpacker(data).run();
    const duplicates = report.exceptions.filter((e) => e.category === "DUPLICATE");

    expect(duplicates).toHaveLength(1);
    // Order still counts as matched -- a soft/suspected duplicate is
    // flagged for review, not silently written off the books.
    expect(report.summary.matched_orders).toBe(1);
  });
});
