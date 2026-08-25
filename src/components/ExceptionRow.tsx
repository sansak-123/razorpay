import type { Exception } from "@/lib/types";
import { CATEGORY_META } from "@/lib/categoryMeta";

export function ExceptionRow({ exception }: { exception: Exception }) {
  const meta = CATEGORY_META[exception.category];
  const confPct = Math.round(exception.confidence * 100);
  const needsReview = exception.confidence < 0.6;
  const ref = exception.order_id || `batch ${exception.settlement_id.slice(0, 14)}…`;

  // Confidence rendered as a segmented meter (5 blocks) rather than a plain
  // progress bar -- reads more like a signal-strength/evidence-weight
  // indicator, which fits the "how sure is the reviewer" framing better
  // than a generic loading-bar shape.
  const segments = 5;
  const filled = Math.round((confPct / 100) * segments);

  return (
    <div className="hover-glow grid grid-cols-1 md:grid-cols-[150px_1fr_130px] gap-4 py-4 px-3 -mx-3 rounded-sm border-b border-ink-700 last:border-0 items-start">
      <div className="flex flex-col gap-1.5">
        <span
          className={`font-mono text-[11px] uppercase tracking-wide border rounded-sm px-2 py-1 h-fit w-fit ${meta.className}`}
        >
          {meta.label}
        </span>
        {exception.ai_reasoned ? (
          <span className="font-mono text-[10px] text-stamp flex items-center gap-1 w-fit">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-stamp" />
            AI-reasoned
          </span>
        ) : (
          <span className="font-mono text-[10px] text-text-dim flex items-center gap-1 w-fit">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-dim/50" />
            Rule-matched
          </span>
        )}
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-mono text-xs text-text-dim">{ref}</span>
          <span className="font-mono text-base font-semibold">
            ₹{exception.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[13.5px] leading-relaxed mb-1.5 text-text">{exception.explanation}</p>
        <p className="text-[12.5px] font-mono text-stamp">
          → {exception.suggested_action}
        </p>
      </div>

      <div className="text-right">
        <div className="flex gap-1 justify-end mb-1.5">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-2 rounded-[1px] ${
                i < filled
                  ? needsReview
                    ? "bg-brick"
                    : "bg-sage"
                  : "bg-ink-600"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-text-dim">
          {confPct}% confidence
        </span>
      </div>
    </div>
  );
}
