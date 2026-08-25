import type { Metadata } from "next";
import { revalidateTag } from "next/cache";
import { getEnvStatus } from "@/lib/envStatus";

export const metadata: Metadata = { title: "Data Source · Settlement Unpacker" };
// This page's whole point is showing live env/config status -- force it to
// read process.env per-request instead of baking build-time values into a
// static page.
export const dynamic = "force-dynamic";

async function refreshReport() {
  "use server";
  // Report data is cached (src/lib/getReport.ts) so 5 sidebar routes don't
  // each re-trigger the Claude/MCP pipeline on navigation. This is the
  // manual escape hatch for that cache during a live demo.
  revalidateTag("settlement-report", "max");
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-ink-700/60 last:border-0">
      <span
        className={`inline-block h-2 w-2 rounded-full shrink-0 ${ok ? "bg-sage" : "bg-text-dim/40"}`}
      />
      <span className="text-[13px] text-text flex-1">{label}</span>
      <span className="font-mono text-[11.5px] text-text-dim">{detail}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const env = getEnvStatus();

  return (
    <div className="fade-in-up">
      <header className="mb-8">
        <div className="font-mono text-[11px] tracking-widest text-stamp uppercase mb-3">
          Data Source
        </div>
        <h1 className="font-display text-4xl font-normal tracking-tight mb-3 text-text">
          Where this data comes from
        </h1>
        <p className="text-text-dim text-[15px] max-w-lg leading-relaxed">
          Booleans and modes only — never actual secret values, even on this
          page.
        </p>
      </header>

      <section className="mb-11">
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Settlement data
        </h2>
        <div className="bg-ink-800 border border-ink-700 rounded-sm px-5 py-2">
          <StatusRow
            label={env.liveMode ? "Live Razorpay MCP data" : "Synthetic data (generateData.ts, seeded)"}
            ok={env.liveMode}
            detail={env.liveMode ? "RAZORPAY_LIVE_MODE=true" : "RAZORPAY_LIVE_MODE unset/false"}
          />
          <StatusRow
            label="Razorpay test-mode API keys"
            ok={env.razorpayKeyConfigured}
            detail={env.razorpayKeyConfigured ? "configured" : "not configured"}
          />
        </div>
      </section>

      <section className="mb-11">
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          AI-reasoned exception classification
        </h2>
        <div className="bg-ink-800 border border-ink-700 rounded-sm px-5 py-2">
          <StatusRow
            label="Anthropic API key"
            ok={env.anthropicKeyConfigured}
            detail={env.anthropicKeyConfigured ? "configured" : "not configured"}
          />
          <StatusRow
            label="OpenRouter API key (fallback)"
            ok={env.openrouterKeyConfigured}
            detail={env.openrouterKeyConfigured ? "configured" : "not configured"}
          />
        </div>
        <p className="font-mono text-[11px] text-text-dim mt-3">
          {env.activeLlmProvider
            ? `Low-confidence exceptions are re-reasoned live via ${env.activeLlmProvider}.`
            : "Neither key is set — low-confidence exceptions keep their rule-based guess and are tagged \"Rule-matched\", not \"AI-reasoned\", on the Reconciliation Log."}
        </p>
      </section>

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Report cache
        </h2>
        <p className="font-mono text-[11px] text-text-dim mb-3 max-w-lg leading-relaxed">
          The reconciliation pipeline (and any Claude calls it makes) is
          cached for an hour so navigating between pages doesn&apos;t
          re-trigger it. Force a fresh run below.
        </p>
        <form action={refreshReport}>
          <button
            type="submit"
            className="hover-glow rounded-sm border border-ink-700 px-4 py-2 text-[12.5px] font-mono text-text-dim hover:text-text cursor-pointer"
          >
            Refresh report now
          </button>
        </form>
      </section>
    </div>
  );
}
