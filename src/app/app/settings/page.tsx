import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEnvStatus } from "@/lib/envStatus";
import { requireUser } from "@/lib/auth/requireUser";
import { saveRun } from "@/lib/db/runs";

export const metadata: Metadata = { title: "Data Source · Unsettle" };
// This page's whole point is showing live env/config status -- force it to
// read process.env per-request instead of baking build-time values into a
// static page.
export const dynamic = "force-dynamic";

async function runReconciliationAgain() {
  "use server";
  // fresh: true skips the shared pipeline cache entirely (see saveRun()'s
  // own comment on why revalidateTag's stale-while-revalidate semantics
  // can't guarantee this). Unlike the old "refresh" action, this INSERTS a
  // new reconciliation_runs row rather than overwriting one, so history is
  // preserved.
  const user = await requireUser();
  await saveRun(user.id, "razorpay", { fresh: true });
  redirect("/app");
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
            label="OpenRouter API key"
            ok={env.openrouterKeyConfigured}
            detail={env.openrouterKeyConfigured ? "configured" : "not configured"}
          />
          <StatusRow
            label="Model"
            ok={env.openrouterKeyConfigured}
            detail={env.openrouterModel}
          />
        </div>
        <p className="font-mono text-[11px] text-text-dim mt-3">
          {env.openrouterKeyConfigured
            ? `Low-confidence exceptions are re-reasoned live via OpenRouter (${env.openrouterModel}).`
            : "OPENROUTER_API_KEY isn't set — low-confidence exceptions keep their rule-based guess and are tagged \"Rule-matched\", not \"AI-reasoned\", on the Reconciliation Log."}
        </p>
      </section>

      <section>
        <h2 className="font-mono text-[12px] uppercase tracking-widest text-text-dim mb-4 pb-2.5 border-b border-ink-700">
          Reconciliation history
        </h2>
        <p className="font-mono text-[11px] text-text-dim mb-3 max-w-lg leading-relaxed">
          Your dashboard shows the most recent run saved to your account. The
          underlying pipeline (and any Claude calls it makes) is cached for
          an hour, so running it again below skips that cache and saves a
          new run to your history rather than overwriting the last one.
        </p>
        <form action={runReconciliationAgain}>
          <button
            type="submit"
            className="hover-glow rounded-sm border border-ink-700 px-4 py-2 text-[12.5px] font-mono text-text-dim hover:text-text cursor-pointer"
          >
            Run reconciliation again
          </button>
        </form>
      </section>
    </div>
  );
}
