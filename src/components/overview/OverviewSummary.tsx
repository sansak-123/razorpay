import Link from "next/link";
import type { Report } from "@/lib/types";
import { HeroReceipt } from "@/components/HeroReceipt";
import { LedgerStats } from "@/components/LedgerStats";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { AmbientMesh } from "@/components/three/AmbientMesh";
import { MoneyRecoveredHero } from "./MoneyRecoveredHero";
import { Recommendations } from "./Recommendations";

export function OverviewSummary({ report }: { report: Report }) {
  const { summary, exceptions_by_category } = report;

  return (
    <div className="fade-in-up">
      <header className="mb-8 relative">
        <AmbientMesh />
        <div className="relative">
          <div className="font-mono text-[12.5px] tracking-widest text-stamp uppercase mb-3">
            Overview
          </div>
          <h1 className="font-display text-4xl md:text-[2.75rem] font-normal tracking-tight mb-3 text-text">
            What your settlement isn&apos;t telling you
          </h1>
          <p className="text-text-dim text-[17px] max-w-lg leading-relaxed">
            One bank credit hides what it actually cost you. Unsettle tears
            it back open — order by order, deduction by deduction — and
            tells you exactly how much of that money you can still get back.
          </p>
        </div>
      </header>

      <div className="fade-in-up">
        <MoneyRecoveredHero summary={summary} />
      </div>

      <section className="mb-10 fade-in-up" style={{ ["--fade-delay" as string]: "40ms" }}>
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          What to do next
        </h2>
        <Recommendations report={report} />
      </section>

      <div className="relative fade-in-up" style={{ ["--fade-delay" as string]: "80ms" }}>
        <HeroReceipt report={report} />
      </div>

      <div className="mb-10 mt-6 fade-in-up" style={{ ["--fade-delay" as string]: "140ms" }}>
        <LedgerStats summary={summary} />
      </div>

      <section className="fade-in-up" style={{ ["--fade-delay" as string]: "200ms" }}>
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700 flex items-center justify-between">
          <span>Exceptions by category</span>
          <Link href="/app/reconciliation" className="normal-case text-stamp hover:text-stamp-dim transition-colors">
            view full log →
          </Link>
        </h2>
        <CategoryBreakdownChart categories={exceptions_by_category} />
      </section>

      <footer className="font-mono text-[12px] text-ink-600 text-center mt-16 leading-relaxed">
        Synthetic data · schema mirrors Razorpay&apos;s real Settlement Recon API<br />
        {summary.total_orders} orders · {summary.total_exceptions} exceptions logged, none hidden
        {summary.ai_reasoned_count > 0 && <> · {summary.ai_reasoned_count} reasoned live by AI, independently verified</>}
        <br />
        This agent classifies, explains, and suggests — it never auto-corrects the books or auto-files anything.
      </footer>
    </div>
  );
}
