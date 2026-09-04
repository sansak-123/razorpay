const STEPS = [
  { n: "01", title: "Capture", detail: "Settlement, order, and bank data via Razorpay's MCP server or seeded synthetic data." },
  { n: "02", title: "Classify", detail: "Deterministic rules resolve what they can; Claude reasons only over what's genuinely ambiguous." },
  { n: "03", title: "Reconcile", detail: "Order-level matching, duplicate detection, and GST input tax credit calculation." },
  { n: "04", title: "Report", detail: "A full confidence-scored audit trail — every exception, none hidden." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 md:px-10 py-16 md:py-24 max-w-5xl mx-auto">
      <p className="font-mono text-[11px] uppercase tracking-widest text-blue text-center mb-3">
        How it works
      </p>
      <h2
        className="text-center text-landing-white font-medium mb-14"
        style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
      >
        Four steps, one honest number.
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
        {STEPS.map((step) => (
          <div key={step.n} className="md:border-l md:border-white/10 md:pl-5">
            <div className="font-mono text-[13px] text-blue mb-2">{step.n}</div>
            <div
              className="text-landing-white font-semibold text-[17px] mb-1.5"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {step.title}
            </div>
            <p className="text-[13.5px] text-landing-text-dim leading-relaxed">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
