import type { Exception } from "./types";

const MIN_SAMPLE_SIZE = 50;
const CHI_SQUARE_CRITICAL_8DF_P05 = 15.51;

const EXPECTED_FRACTION: Record<number, number> = {};
for (let d = 1; d <= 9; d++) EXPECTED_FRACTION[d] = Math.log10(1 + 1 / d);

export interface BenfordResult {
  sampleSize: number;
  sufficientSample: boolean;
  chiSquare: number | null;
  criticalValue: number;
  flagged: boolean;
  digitDistribution: Record<string, number>;
}

function leadingDigit(amount: number): number | null {
  const digits = Math.abs(amount).toString().replace(".", "").replace(/^0+/, "");
  const d = parseInt(digits[0], 10);
  return d >= 1 && d <= 9 ? d : null;
}

export function checkBenfordsLaw(exceptions: Exception[]): BenfordResult {
  const amounts = exceptions
    .filter((e) => e.category === "UNEXPLAINED" && e.amount > 0)
    .map((e) => e.amount);

  const counts: Record<number, number> = {};
  for (let d = 1; d <= 9; d++) counts[d] = 0;
  for (const amount of amounts) {
    const d = leadingDigit(amount);
    if (d) counts[d]++;
  }

  const n = amounts.length;
  let chiSquare = 0;
  if (n > 0) {
    for (let d = 1; d <= 9; d++) {
      const expectedCount = EXPECTED_FRACTION[d] * n;
      chiSquare += Math.pow(counts[d] - expectedCount, 2) / expectedCount;
    }
  }

  const sufficientSample = n >= MIN_SAMPLE_SIZE;
  const digitDistribution: Record<string, number> = {};
  for (let d = 1; d <= 9; d++) digitDistribution[String(d)] = counts[d];

  return {
    sampleSize: n,
    sufficientSample,
    chiSquare: n > 0 ? Math.round(chiSquare * 100) / 100 : null,
    criticalValue: CHI_SQUARE_CRITICAL_8DF_P05,
    flagged: sufficientSample && chiSquare > CHI_SQUARE_CRITICAL_8DF_P05,
    digitDistribution,
  };
}
