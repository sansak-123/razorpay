import { describe, it, expect } from "vitest";
import { buildRecommendations } from "../recommendations";
import type { Report } from "../types";

function baseReport(overrides: Partial<Report["summary"]> = {}, exceptions: Report["exceptions"] = []): Report {
  return {
    summary: {
      total_orders: 10,
      matched_orders: 10,
      match_rate_pct: 100,
      baseline_manual_match_rate_pct: 51,
      total_fee_deducted: 100,
      total_tax_deducted: 18,
      gst_itc_claimable: 18,
      gst_itc_at_risk: 0,
      money_surfaced_by_agent: 0,
      total_exceptions: exceptions.length,
      unresolved_exceptions: exceptions.filter((e) => e.confidence < 0.6).length,
      ai_reasoned_count: 0,
      ai_verification_failed_count: 0,
      ...overrides,
    },
    exceptions_by_category: {},
    exceptions,
    benford: { sampleSize: 0, sufficientSample: false, chiSquare: null, criticalValue: 15.51, flagged: false, digitDistribution: {} },
  };
}

describe("buildRecommendations", () => {
  it("recommends itemising GST when at-risk credit exists", () => {
    const report = baseReport({ gst_itc_at_risk: 500 });
    const recs = buildRecommendations(report);
    expect(recs.some((r) => r.title.includes("GST"))).toBe(true);
  });

  it("recommends excluding duplicates from revenue when any exist", () => {
    const report = baseReport({}, [
      { order_id: "order_1", settlement_id: "s1", category: "DUPLICATE", amount: 250, confidence: 0.9, explanation: "x", suggested_action: "x" },
    ]);
    const recs = buildRecommendations(report);
    expect(recs.some((r) => r.title.includes("duplicate"))).toBe(true);
  });

  it("recommends reviewing low-confidence exceptions", () => {
    const report = baseReport({}, [
      { order_id: "", settlement_id: "s1", category: "UNEXPLAINED", amount: 100, confidence: 0.3, explanation: "x", suggested_action: "x" },
    ]);
    const recs = buildRecommendations(report);
    expect(recs.some((r) => r.title.includes("low-confidence"))).toBe(true);
  });

  it("flags unmatched orders", () => {
    const report = baseReport({ total_orders: 10, matched_orders: 7 });
    const recs = buildRecommendations(report);
    expect(recs.some((r) => r.title.includes("not yet in any settlement"))).toBe(true);
  });

  it("says nothing urgent when everything is clean", () => {
    const report = baseReport();
    const recs = buildRecommendations(report);
    expect(recs).toHaveLength(1);
    expect(recs[0].title).toContain("Nothing urgent");
  });

  it("ranks higher-impact recommendations first within the same priority", () => {
    const report = baseReport({ gst_itc_at_risk: 100 }, [
      { order_id: "order_1", settlement_id: "s1", category: "DUPLICATE", amount: 900, confidence: 0.9, explanation: "x", suggested_action: "x" },
    ]);
    const recs = buildRecommendations(report);
    // Both are priority 1 -- the ₹900 duplicate should outrank the ₹100 GST item.
    expect(recs[0].title).toContain("duplicate");
  });
});
