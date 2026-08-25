"use client";

import { scaleLinear } from "d3-scale";

const WIDTH = 160;
const HEIGHT = 20;
const PAD = 10;

// Before/after per item -> dumbbell, 1 hue/2 shades (not 2 unrelated
// categorical colors -- these are the same "amount" axis, just two sources
// for it). Uses Razorpay's own two brand blues as the two shades.
export function BatchDumbbellChart({
  credited,
  linesTotal,
  domainMax,
}: {
  credited: number;
  linesTotal: number;
  domainMax: number;
}) {
  const scale = scaleLinear()
    .domain([0, domainMax || 1])
    .range([PAD, WIDTH - PAD])
    .clamp(true);

  const x1 = scale(linesTotal);
  const x2 = scale(credited);
  const matched = Math.abs(credited - linesTotal) < 1;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`Lines total ₹${linesTotal} vs bank credit ₹${credited}`}
    >
      <line
        x1={x1}
        x2={x2}
        y1={HEIGHT / 2}
        y2={HEIGHT / 2}
        stroke={matched ? "var(--color-ink-600)" : "var(--color-brick)"}
        strokeWidth={2}
      />
      <circle cx={x1} cy={HEIGHT / 2} r={4} fill="var(--color-stamp-dim)" />
      <circle cx={x2} cy={HEIGHT / 2} r={4} fill="var(--color-stamp)" stroke="var(--color-ink-900)" strokeWidth={1} />
    </svg>
  );
}
