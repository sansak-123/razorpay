"use client";

import type { Report } from "@/lib/types";
import { CountUpNumber } from "@/components/overview/CountUpNumber";
import { useInView } from "./useInView";

// Real numbers from the current run's actual report -- not landing-page-only
// invented stats. Count-up plays once this section scrolls into view.
export function StatSection({ report }: { report: Report }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const { summary } = report;

  const stats = [
    { label: "Match rate", value: Math.round(summary.match_rate_pct), suffix: "%", prefix: "" },
    { label: "GST ITC claimable", value: Math.round(summary.gst_itc_claimable), suffix: "", prefix: "₹" },
    { label: "Money surfaced", value: Math.round(summary.money_surfaced_by_agent), suffix: "", prefix: "₹" },
    { label: "Exceptions logged", value: summary.total_exceptions, suffix: "", prefix: "" },
  ];

  return (
    <section id="problem" className="px-6 md:px-10 py-16 md:py-24 max-w-5xl mx-auto">
      <p className="font-mono text-[11px] uppercase tracking-widest text-blue text-center mb-3">
        Why now
      </p>
      <h2
        className="text-center text-landing-white font-medium mb-14 max-w-2xl mx-auto"
        style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
      >
        Verification capacity, not generation speed, is the bottleneck.
      </h2>

      <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div
              className="text-blue font-bold tabular-nums"
              style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              {s.prefix}
              <CountUpNumber value={s.value} start={inView} />
              {s.suffix}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-landing-text-dim mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
