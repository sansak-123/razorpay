import { describe, it, expect } from "vitest";
import { verifyReasonedResult } from "../llmClassifier";
import type { Order } from "../types";

const realOrders: Order[] = [
  {
    order_id: "order_ABC123real",
    payment_id: "pay_1",
    order_amount: 500,
    method: "upi",
    created_at: "2026-08-01 10:00",
    status: "paid",
  },
];

describe("verifyReasonedResult", () => {
  it("accepts a well-formed result referencing a real order", () => {
    const result = verifyReasonedResult(
      {
        category: "REFUND",
        confidence: 0.8,
        explanation: "This matches order_ABC123real, a partial refund.",
        suggested_action: "Post as a refund.",
      },
      realOrders
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a category outside the 4 real ExceptionCategory values", () => {
    // The prompt used to allow 6 categories while the type only supports 4
    // -- this is exactly the bug that verification exists to catch.
    const result = verifyReasonedResult(
      {
        category: "FEE_DEDUCTION",
        confidence: 0.8,
        explanation: "Looks like a fee.",
        suggested_action: "x",
      },
      realOrders
    );
    expect(result.valid).toBe(false);
  });

  it("rejects an out-of-range confidence", () => {
    const result = verifyReasonedResult(
      { category: "REFUND", confidence: 1.5, explanation: "x", suggested_action: "x" },
      realOrders
    );
    expect(result.valid).toBe(false);
  });

  it("rejects a non-numeric confidence", () => {
    const result = verifyReasonedResult(
      { category: "REFUND", confidence: "high", explanation: "x", suggested_action: "x" },
      realOrders
    );
    expect(result.valid).toBe(false);
  });

  it("rejects an explanation that references a nonexistent order (hallucination)", () => {
    const result = verifyReasonedResult(
      {
        category: "REFUND",
        confidence: 0.8,
        explanation: "This matches order_FAKE999doesnotexist perfectly.",
        suggested_action: "x",
      },
      realOrders
    );
    expect(result.valid).toBe(false);
  });

  it("rejects a missing or empty explanation", () => {
    const result = verifyReasonedResult(
      { category: "REFUND", confidence: 0.8, explanation: "", suggested_action: "x" },
      realOrders
    );
    expect(result.valid).toBe(false);
  });

  it("accepts an explanation that mentions no order_id at all", () => {
    // Category-level reasoning (rounding, batch-level gaps) legitimately
    // has no order reference -- verification shouldn't punish that.
    const result = verifyReasonedResult(
      {
        category: "ROUNDING",
        confidence: 0.9,
        explanation: "Sub-rupee amount, consistent with rounding dust.",
        suggested_action: "No action needed.",
      },
      realOrders
    );
    expect(result.valid).toBe(true);
  });
});
