import type { BenfordResult } from "@/lib/benfordCheck";

// Deliberately not a pass/fail badge -- with a small sample, "flagged: false"
// would look like a clean bill of health when really the test just doesn't
// have enough data points to say anything. sufficientSample gates the
// verdict entirely; below it, this shows the distribution for transparency
// and says plainly that it isn't a real signal yet.
export function BenfordNote({ benford }: { benford: BenfordResult }) {
  return (
    <div className="hover-glow rounded-sm border border-ink-700 bg-ink-800 px-4 py-3.5 mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-text-dim">
          Benford&apos;s Law check — unexplained amounts
        </span>
        {benford.sufficientSample ? (
          <span className={`font-mono text-[10.5px] ${benford.flagged ? "text-brick" : "text-sage"}`}>
            {benford.flagged ? "deviates from expected distribution" : "consistent with natural distribution"}
          </span>
        ) : (
          <span className="font-mono text-[10.5px] text-text-dim">
            insufficient sample
          </span>
        )}
      </div>
      <p className="text-[12.5px] text-text-dim leading-relaxed">
        {benford.sufficientSample ? (
          <>
            χ² = {benford.chiSquare} against a critical value of {benford.criticalValue} (n={benford.sampleSize}).
            {benford.flagged
              ? " Worth escalating as a group, not just individually — this is consistent with (not proof of) a systematic pattern rather than independent random errors."
              : " No sign of a coordinated/systematic pattern across these amounts."}
          </>
        ) : (
          <>
            Only {benford.sampleSize} unexplained amount{benford.sampleSize === 1 ? "" : "s"} on record — a
            chi-square test needs roughly 50+ to say anything meaningful, so this stays informational only
            rather than a verdict. Implemented and functional; most meaningful at production scale with a
            full settlement history.
          </>
        )}
      </p>
    </div>
  );
}
