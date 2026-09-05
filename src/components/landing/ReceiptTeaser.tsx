"use client";

import type { Report } from "@/lib/types";
import { HeroReceipt } from "@/components/HeroReceipt";
import { useInView } from "./useInView";

export function ReceiptTeaser({ report }: { report: Report }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);

  return (
    <section className="px-6 md:px-10 py-16 md:py-24 max-w-3xl mx-auto">
      <p className="font-mono text-[12.5px] uppercase tracking-widest text-blue text-center mb-3">
        Real output, live seeded data
      </p>
      <h2
        className="text-center text-landing-white font-medium mb-10"
        style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
      >
        This is what gets unpacked.
      </h2>
      <div ref={ref} className={`scroll-reveal ${inView ? "is-visible" : ""}`}>
        <HeroReceipt report={report} />
      </div>
    </section>
  );
}
