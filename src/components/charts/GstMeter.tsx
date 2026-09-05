"use client";

import { scaleLinear } from "d3-scale";

export function GstMeter({
  claimable,
  atRisk,
}: {
  claimable: number;
  atRisk: number;
}) {
  const total = claimable + atRisk;
  const scale = scaleLinear().domain([0, total || 1]).range([0, 100]).clamp(true);
  const claimablePct = scale(claimable);
  const atRiskPct = 100 - claimablePct;

  return (
    <div className="hover-glow rounded-sm border border-ink-700 bg-ink-800 px-5 py-4">
      <div className="flex h-4 w-full overflow-hidden rounded-sm bg-ink-700">
        {claimablePct > 0 && (
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{
              width: `${claimablePct}%`,
              background: "linear-gradient(90deg, var(--color-sage), color-mix(in oklab, var(--color-sage) 80%, white))",
            }}
          />
        )}
        {atRiskPct > 0 && (
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{
              width: `${atRiskPct}%`,
              background: "linear-gradient(90deg, color-mix(in oklab, var(--color-brick) 85%, black), var(--color-brick))",
            }}
          />
        )}
      </div>
      <div className="mt-3 flex justify-between text-[14.5px]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-sage" />
          <span className="text-text-dim">GST ITC claimable</span>
          <span className="font-mono text-text">
            ₹{claimable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-brick" />
          <span className="text-text-dim">At risk</span>
          <span className="font-mono text-text">
            ₹{atRisk.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </div>
  );
}
