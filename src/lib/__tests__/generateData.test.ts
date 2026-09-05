import { describe, it, expect } from "vitest";
import { generateData } from "../generateData";

// Regression test for the seeded-PRNG scoping bug (see README "What broke,
// and how we got out" #2): the random generator used to be instantiated
// once at module load, so its internal state kept drifting across every
// subsequent call -- two call sites (page.tsx and /api/report) showed
// different totals from the same seed. The fix creates a fresh PRNG
// instance inside generateData() on every call. This test would have
// failed on the old code: the second call would have continued from
// wherever the module-level PRNG's state had drifted to.
describe("generateData", () => {
  it("produces byte-identical output across repeated calls (seed 42 is truly fixed)", () => {
    const first = generateData();
    const second = generateData();

    expect(second).toEqual(first);
  });

  it("produces a schema-consistent dataset of at least 50 orders", () => {
    const data = generateData();
    expect(data.orders.length).toBeGreaterThanOrEqual(50);
    expect(data.settlementLines.length).toBeGreaterThan(0);
    expect(data.bankRows.length).toBeGreaterThan(0);
  });
});
