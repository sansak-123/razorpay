import { describe, it, expect } from "vitest";
import { answerSettlementQuestion } from "../qaAgent";
import type { Report, Order, SettlementLine } from "../types";

// No OPENROUTER_API_KEY in the test environment (Vitest doesn't load
// .env.local), so answerSettlementQuestion() takes its documented
// LLMNotConfiguredError fallback path: the raw retrieved context is
// returned directly, unpolished, with aiAnswered: false. That's actually
// ideal for testing retrieval/grounding in isolation -- it proves the
// STRUCTURED RETRIEVAL layer (which is the part answering "does this
// correctly cite real data / honestly decline") is correct, independent of
// whatever the LLM would have said on top of it.

const orders: Order[] = [
  {
    order_id: "order_REAL001",
    payment_id: "pay_1",
    order_amount: 3802.33,
    method: "upi",
    created_at: "2026-08-01 10:00",
    status: "paid",
  },
];

const settlementLines: SettlementLine[] = [
  {
    entity_id: "pay_1",
    type: "payment",
    debit: 0,
    credit: 380233,
    amount: 380233,
    fee: 7604,
    tax: 1369,
    settlement_id: "setl_1",
    settlement_utr: "UTR1",
    order_id: "order_REAL001",
    method: "upi",
    card_network: "",
    settled_at: "2026-08-02 10:00",
  },
];

const report: Report = {
  summary: {
    total_orders: 1,
    matched_orders: 1,
    match_rate_pct: 100,
    baseline_manual_match_rate_pct: 51,
    total_fee_deducted: 76.04,
    total_tax_deducted: 13.69,
    gst_itc_claimable: 13.69,
    gst_itc_at_risk: 0,
    money_surfaced_by_agent: 250,
    total_exceptions: 1,
    unresolved_exceptions: 0,
    ai_reasoned_count: 0,
    ai_verification_failed_count: 0,
  },
  exceptions_by_category: { DUPLICATE: { count: 1, amount: 250 } },
  exceptions: [
    {
      order_id: "order_REAL001",
      settlement_id: "setl_1",
      category: "DUPLICATE",
      amount: 250,
      confidence: 0.9,
      explanation: "Order order_REAL001 appears settled twice.",
      suggested_action: "Exclude from revenue.",
    },
  ],
  benford: {
    sampleSize: 0,
    sufficientSample: false,
    chiSquare: null,
    criticalValue: 15.51,
    flagged: false,
    digitDistribution: {},
  },
};

describe("answerSettlementQuestion (structured retrieval)", () => {
  it("cites the real order's actual data when asked about a real order ID", async () => {
    const { answer } = await answerSettlementQuestion(
      "Why was order_REAL001 flagged?",
      report,
      orders,
      settlementLines
    );

    expect(answer).toContain("order_REAL001");
    expect(answer).toContain("3,802.33"); // the order's real amount, not invented
    expect(answer).toContain("DUPLICATE");
  });

  it("does not invent data for a question about an order that doesn't exist", async () => {
    const { answer } = await answerSettlementQuestion(
      "Why was order_TOTALLYFAKE99 flagged?",
      report,
      orders,
      settlementLines
    );

    // No order matches the ID, so it must not fabricate order details --
    // it should say plainly that nothing matches.
    expect(answer).toContain("No order in the ledger matches");
    expect(answer).not.toContain("3,802.33");
  });

  it("answers a category question with the real category totals", async () => {
    const { answer } = await answerSettlementQuestion(
      "How much duplicate money did you catch?",
      report,
      orders,
      settlementLines
    );

    expect(answer).toContain("DUPLICATE");
    expect(answer).toContain("250");
  });

  it("falls back to the highest-value exceptions for a vague question, rather than a blank non-answer", async () => {
    const { answer } = await answerSettlementQuestion(
      "How's it going overall today?",
      report,
      orders,
      settlementLines
    );

    // "overall" isn't in the match-rate keyword list on its own without
    // "match rate"/"summary"/etc, so this should hit the fallback tier --
    // real exceptions, not nothing.
    expect(answer).toContain("order_REAL001");
  });
});
