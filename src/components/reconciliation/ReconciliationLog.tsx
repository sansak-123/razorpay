"use client";

import { useState, useMemo } from "react";
import type { Report } from "@/lib/types";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { ExceptionRow } from "@/components/ExceptionRow";
import { BenfordNote } from "./BenfordNote";

export function ReconciliationLog({ report }: { report: Report }) {
  const { exceptions_by_category, exceptions, benford } = report;
  const [filter, setFilter] = useState<string | null>(null);

  const filteredExceptions = useMemo(() => {
    const list = filter ? exceptions.filter((e) => e.category === filter) : exceptions;
    return [...list].sort((a, b) => b.amount - a.amount);
  }, [exceptions, filter]);

  return (
    <div className="fade-in-up">
      <header className="mb-8">
        <div className="font-mono text-[12.5px] tracking-widest text-stamp uppercase mb-3">
          Reconciliation Log
        </div>
        <h1 className="font-display text-4xl font-normal tracking-tight mb-3 text-text">
          Exception audit trail
        </h1>
        <p className="text-text-dim text-[17px] max-w-lg leading-relaxed">
          Every exception the agent found, with its confidence and whether a
          rule matched it or the AI reasoned about it directly.
        </p>
      </header>

      <section className="mb-11">
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700 flex items-center justify-between">
          <span>Exceptions by category</span>
          {filter && (
            <button onClick={() => setFilter(null)} className="normal-case text-stamp hover:text-stamp-dim transition-colors cursor-pointer">
              clear filter ×
            </button>
          )}
        </h2>
        <CategoryBreakdownChart
          categories={exceptions_by_category}
          activeFilter={filter}
          onFilter={setFilter}
        />
      </section>

      <BenfordNote benford={benford} />

      <section>
        <h2 className="font-mono text-[13.5px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Full log
          {filter && (
            <span className="normal-case text-text-dim/70 ml-2">
              ({filteredExceptions.length} of {exceptions.length})
            </span>
          )}
        </h2>
        {filteredExceptions.map((e, i) => (
          <ExceptionRow key={`${e.order_id}-${e.settlement_id}-${i}`} exception={e} />
        ))}
      </section>
    </div>
  );
}
