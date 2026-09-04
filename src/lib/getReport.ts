import { unstable_cache } from "next/cache";
import { getSettlementData } from "./dataSource";
import { SettlementUnpacker } from "./reconcile";
import type { Report } from "./types";
import type { GeneratedData } from "./generateData";

// The ONE place every route calls into for report data. Without this, each
// of the 5 dashboard pages calling getSettlementData() + SettlementUnpacker
// independently would re-run the Claude reasoning pass (and, in live mode,
// re-hit Razorpay's MCP server) on every sidebar click -- unstable_cache
// makes the pipeline run once per revalidate window instead, shared across
// every page and the /api/report route. keyParts includes the live-mode
// flag so synthetic and live data never share a cache slot.
export interface ReportBundle {
  report: Report;
  data: GeneratedData;
}

// Extracted so an explicit "run it again" action (see src/lib/db/runs.ts's
// saveRun()) can call it directly and skip the cache -- revalidateTag's
// "max" profile is stale-while-revalidate, which does NOT guarantee the
// very next call sees fresh data (it can still return the old value while
// revalidating in the background), so it's the wrong tool for "the user
// explicitly asked for a fresh computation right now."
export async function computeReportBundle(): Promise<ReportBundle> {
  const data = await getSettlementData();
  const engine = new SettlementUnpacker(data);
  const report = await engine.run();
  return { report, data };
}

const loadReportBundle = unstable_cache(
  computeReportBundle,
  ["settlement-report-bundle", process.env.RAZORPAY_LIVE_MODE ?? "false"],
  { revalidate: 3600, tags: ["settlement-report"] }
);

export async function getReport(): Promise<Report> {
  return (await loadReportBundle()).report;
}

export async function getReportBundle(): Promise<ReportBundle> {
  return loadReportBundle();
}
