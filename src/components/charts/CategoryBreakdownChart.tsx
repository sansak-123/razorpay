"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import type { Report } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { ChartTooltip } from "./ChartTooltip";

interface Props {
  categories: Report["exceptions_by_category"];
  activeFilter?: string | null;
  onFilter?: (category: string | null) => void;
}

// Part-to-whole across 4 named categories -> horizontal bar, not a donut
// (donuts for comparing close values are a named anti-pattern). Category
// hues are the fixed, validated categorical set from categoryMeta.ts --
// never reassigned by sort order, only the bar length responds to amount.
// Interactive (click-to-filter) on the Reconciliation Log; passed without
// onFilter it's a read-only teaser on Overview.
export function CategoryBreakdownChart({ categories, activeFilter, onFilter }: Props) {
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null);
  const entries = Object.entries(categories).sort((a, b) => b[1].amount - a[1].amount);
  const maxAmount = Math.max(...entries.map(([, v]) => v.amount), 1);

  const widthScale = useMemo(
    () => scaleLinear().domain([0, maxAmount]).range([0, 100]).clamp(true),
    [maxAmount]
  );

  const interactive = Boolean(onFilter);

  return (
    <div className="relative">
      {entries.map(([cat, data]) => {
        const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META];
        const pct = widthScale(data.amount);
        const isActive = activeFilter === cat;
        const Tag = interactive ? "button" : "div";

        return (
          <Tag
            key={cat}
            {...(interactive
              ? { onClick: () => onFilter!(isActive ? null : cat) }
              : {})}
            onMouseEnter={(e: React.MouseEvent) => {
              const rect = e.currentTarget.parentElement!.getBoundingClientRect();
              setHover({
                key: cat,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
            onMouseMove={(e: React.MouseEvent) => {
              const rect = e.currentTarget.parentElement!.getBoundingClientRect();
              setHover({
                key: cat,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
            onMouseLeave={() => setHover(null)}
            className={`w-full grid grid-cols-1 md:grid-cols-[200px_1fr_110px] items-center gap-3.5 py-2.5 text-left transition-opacity ${
              interactive ? "cursor-pointer" : ""
            } ${activeFilter && !isActive ? "opacity-35" : "opacity-100"}`}
          >
            <div className="text-[13px] text-text-dim">
              {meta?.label ?? cat}{" "}
              <span className="font-mono text-[11px] text-text-dim/70">
                ×{data.count}
              </span>
            </div>
            <div className="h-2 bg-ink-700 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${meta?.hex}cc, ${meta?.hex})`,
                }}
              />
            </div>
            <div className="font-mono text-[13px] text-right text-text">
              ₹{data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </Tag>
        );
      })}

      {hover &&
        (() => {
          const data = categories[hover.key];
          const meta = CATEGORY_META[hover.key as keyof typeof CATEGORY_META];
          if (!data) return null;
          return (
            <ChartTooltip x={hover.x} y={hover.y} visible>
              <div className="font-mono text-[11px] uppercase tracking-wide" style={{ color: meta?.hex }}>
                {meta?.label}
              </div>
              <div className="font-mono text-[13px] text-text">
                ₹{data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} · {data.count} case{data.count === 1 ? "" : "s"}
              </div>
            </ChartTooltip>
          );
        })()}
    </div>
  );
}
