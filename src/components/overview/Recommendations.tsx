import type { Report } from "@/lib/types";
import { buildRecommendations } from "@/lib/recommendations";

export function Recommendations({ report }: { report: Report }) {
  const recs = buildRecommendations(report);

  return (
    <div className="hover-glow bg-ink-800 border border-ink-700 rounded-sm px-5 py-4">
      <ol className="space-y-3.5">
        {recs.map((r, i) => (
          <li key={r.title} className="flex gap-3">
            <span className="font-mono text-[13.5px] text-stamp shrink-0 pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="text-[15.5px] font-semibold text-text mb-0.5">{r.title}</div>
              <p className="text-[14px] text-text-dim leading-relaxed">{r.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
