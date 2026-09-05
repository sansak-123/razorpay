import { describe, it, expect } from "vitest";
import { checkBenfordsLaw } from "../benfordCheck";
import type { Exception } from "../types";

function unexplainedException(amount: number): Exception {
  return {
    order_id: "",
    settlement_id: "setl_test",
    category: "UNEXPLAINED",
    amount,
    confidence: 0.3,
    explanation: "test fixture",
    suggested_action: "",
  };
}

describe("checkBenfordsLaw", () => {
  it("refuses to call a verdict below the minimum sample size (honesty gate)", () => {
    // This app's real synthetic dataset has ~3 UNEXPLAINED exceptions --
    // exactly the case this gate exists for. A chi-square test on 3 points
    // is noise, not a signal, no matter what it computes to.
    const exceptions = [10, 20, 30].map(unexplainedException);
    const result = checkBenfordsLaw(exceptions);

    expect(result.sampleSize).toBe(3);
    expect(result.sufficientSample).toBe(false);
    expect(result.flagged).toBe(false); // must never flag on an insufficient sample
  });

  it("flags a distribution that's obviously NOT Benford-shaped, given enough samples", () => {
    // 60 amounts, every single one leading with digit 1 -- about 3x what
    // Benford's Law expects (~30%) even before doing the math, and n=60
    // clears the sample-size gate.
    const amounts = Array.from({ length: 60 }, (_, i) => 100 + i);
    const result = checkBenfordsLaw(amounts.map(unexplainedException));

    expect(result.sufficientSample).toBe(true);
    expect(result.chiSquare).not.toBeNull();
    expect(result.chiSquare as number).toBeGreaterThan(result.criticalValue);
    expect(result.flagged).toBe(true);
  });

  it("does not flag a distribution that matches Benford's expected proportions", () => {
    // Counts per leading digit set to (approximately) Benford's own
    // expected fractions of n=100: 30/18/12/10/8/7/6/5/4. Each count stays
    // under 100 so `base + i` (e.g. 101..130 for digit 1) never crosses
    // into the next leading digit.
    const countsByDigit = [30, 18, 12, 10, 8, 7, 6, 5, 4];
    const amounts: number[] = [];
    countsByDigit.forEach((count, idx) => {
      const digit = idx + 1;
      for (let i = 1; i <= count; i++) amounts.push(digit * 100 + i);
    });

    const result = checkBenfordsLaw(amounts.map(unexplainedException));

    expect(result.sampleSize).toBe(100);
    expect(result.sufficientSample).toBe(true);
    expect(result.chiSquare as number).toBeLessThan(result.criticalValue);
    expect(result.flagged).toBe(false);
  });

  it("only looks at UNEXPLAINED amounts, ignoring other categories", () => {
    const mixed: Exception[] = [
      unexplainedException(100),
      { ...unexplainedException(200), category: "REFUND" },
      { ...unexplainedException(300), category: "ROUNDING" },
    ];
    const result = checkBenfordsLaw(mixed);
    expect(result.sampleSize).toBe(1);
  });
});
