"use client";

import { useMemo, useState } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import { line as d3line, area as d3area, curveMonotoneX } from "d3-shape";
import { extent, max, bisector } from "d3-array";
import { timeFormat } from "d3-time-format";
import type { BatchSummary } from "@/lib/batchSummary";
import { ChartTooltip } from "./ChartTooltip";

const WIDTH = 640;
const HEIGHT = 220;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 56 };

// Trend-over-time job -> line + area, single series, one axis. No legend
// needed for one series (the card title names it, per the dataviz skill).
export function SettlementTrendChart({ batches }: { batches: BatchSummary[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = useMemo(
    () =>
      batches.map((b) => ({
        date: new Date(b.value_date),
        amount: b.credited_amount,
        batch: b,
      })),
    [batches]
  );

  const { xScale, yScale, linePath, areaPath, formatDate } = useMemo(() => {
    const [minDate, maxDate] = extent(points, (p) => p.date) as [Date, Date];
    const maxAmount = max(points, (p) => p.amount) ?? 0;

    const xScale = scaleTime()
      .domain([minDate ?? new Date(), maxDate ?? new Date()])
      .range([MARGIN.left, WIDTH - MARGIN.right]);
    const yScale = scaleLinear()
      .domain([0, maxAmount * 1.15])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const lineGen = d3line<(typeof points)[number]>()
      .x((p) => xScale(p.date))
      .y((p) => yScale(p.amount))
      .curve(curveMonotoneX);
    const areaGen = d3area<(typeof points)[number]>()
      .x((p) => xScale(p.date))
      .y0(HEIGHT - MARGIN.bottom)
      .y1((p) => yScale(p.amount))
      .curve(curveMonotoneX);

    return {
      xScale,
      yScale,
      linePath: lineGen(points) ?? "",
      areaPath: areaGen(points) ?? "",
      formatDate: timeFormat("%d %b"),
    };
  }, [points]);

  const bisectDate = bisector<(typeof points)[number], Date>((p) => p.date).left;

  if (points.length === 0) {
    return <p className="text-text-dim text-[13px]">No settlement batches yet.</p>;
  }

  const yTicks = yScale.ticks(4);
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        onMouseMove={(e) => {
          const svg = e.currentTarget;
          const rect = svg.getBoundingClientRect();
          const scaleX = WIDTH / rect.width;
          const mouseX = (e.clientX - rect.left) * scaleX;
          const targetDate = xScale.invert(mouseX);
          let idx = bisectDate(points, targetDate, 1);
          idx = Math.min(idx, points.length - 1);
          const prev = points[idx - 1];
          const curr = points[idx];
          const closer =
            !prev || +targetDate - +prev.date > +curr.date - +targetDate ? idx : idx - 1;
          setHoverIdx(Math.max(0, closer));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-stamp)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-stamp)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Hairline recessive gridlines -- one shade off the surface */}
        {yTicks.map((t) => (
          <line
            key={t}
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--color-ink-700)"
            strokeWidth={1}
          />
        ))}
        {yTicks.map((t) => (
          <text
            key={`label-${t}`}
            x={MARGIN.left - 8}
            y={yScale(t)}
            dy="0.32em"
            textAnchor="end"
            className="fill-text-dim"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            ₹{t >= 1000 ? `${Math.round(t / 1000)}k` : t}
          </text>
        ))}

        <path d={areaPath} fill="url(#trend-fill)" />
        <path d={linePath} fill="none" stroke="var(--color-stamp)" strokeWidth={2} />

        {points.map((p, i) => (
          <circle
            key={p.batch.settlement_id}
            cx={xScale(p.date)}
            cy={yScale(p.amount)}
            r={hoverIdx === i ? 4 : 0}
            fill="var(--color-stamp)"
          />
        ))}

        {hovered && (
          <line
            x1={xScale(hovered.date)}
            x2={xScale(hovered.date)}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            stroke="var(--color-stamp-dim)"
            strokeWidth={1}
            strokeDasharray="0"
          />
        )}

        {points
          .filter((_, i) => i === 0 || i === points.length - 1)
          .map((p) => (
            <text
              key={`x-${p.batch.settlement_id}`}
              x={xScale(p.date)}
              y={HEIGHT - MARGIN.bottom + 16}
              textAnchor={xScale(p.date) < WIDTH / 2 ? "start" : "end"}
              className="fill-text-dim"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {formatDate(p.date)}
            </text>
          ))}
      </svg>

      {hovered && (
        <ChartTooltip
          x={`${(xScale(hovered.date) / WIDTH) * 100}%`}
          y={`${(yScale(hovered.amount) / HEIGHT) * 100}%`}
          visible
        >
          <div className="font-mono text-[11px] text-text-dim">{formatDate(hovered.date)}</div>
          <div className="font-mono text-[13px] text-text">
            ₹{hovered.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="font-mono text-[10px] text-text-dim">
            {hovered.batch.order_count} orders · UTR {hovered.batch.utr.slice(0, 8)}…
          </div>
        </ChartTooltip>
      )}
    </div>
  );
}
