// Real integrations, not customer logos we don't have -- same muted-row
// visual treatment, but every mark here is something this project actually
// talks to. Text/wordmark badges rather than fetched brand SVGs: no
// hotlinking, no license ambiguity, and still reads as a credibility row.
const INTEGRATIONS = [
  { label: "Razorpay", detail: "Settlement Recon API" },
  { label: "MCP", detail: "Model Context Protocol" },
  { label: "OpenRouter", detail: "Model routing" },
  { label: "Next.js", detail: "App Router" },
];

export function CredibilityBar() {
  return (
    <section className="border-y border-white/5 py-8">
      <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
        {INTEGRATIONS.map((item) => (
          <div key={item.label} className="text-center opacity-60 hover:opacity-100 transition-opacity">
            <div
              className="text-[16px] font-semibold text-landing-white tracking-tight"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {item.label}
            </div>
            <div className="text-[10.5px] font-mono uppercase tracking-wide text-landing-text-dim mt-0.5">
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
