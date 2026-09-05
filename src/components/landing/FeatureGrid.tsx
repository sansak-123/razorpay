const FEATURES = [
  {
    title: "Order-level reconciliation",
    detail: "Explodes one lumped bank credit back into every order, fee, tax, and refund that made it up.",
  },
  {
    title: "GST input tax credit recovery",
    detail: "Automatically quantifies claimable credit your settlement feed never itemised — not an estimate.",
  },
  {
    title: "Duplicate detection, not just exact matches",
    detail: "Weighted scoring catches a resubmitted payment at a different amount or time, not only byte-identical copies.",
  },
  {
    title: "AI judgment, independently verified",
    detail: "Every AI-reasoned exception is checked before it's trusted — invalid category, bad confidence, or a hallucinated order all get rejected and fall back to the rule.",
  },
  {
    title: "Ask your ledger anything",
    detail: "A grounded Q&A chat that answers from your actual data, and says so plainly when it can't.",
  },
  {
    title: "Nothing hidden",
    detail: "Every exception logged with its confidence and reasoning — the honest gaps included, not just the clean matches.",
  },
];

export function FeatureGrid() {
  return (
    <section className="px-6 md:px-10 py-14 md:py-20 border-y border-white/5 bg-navy-800/30">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-9">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <div
              className="text-landing-white font-semibold text-[17.5px] mb-1.5"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {f.title}
            </div>
            <p className="text-[15.5px] text-landing-text-dim leading-relaxed">{f.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
