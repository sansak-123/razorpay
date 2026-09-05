import { unstable_cache } from "next/cache";
import { getSettlementData } from "./dataSource";
import { SettlementUnpacker } from "./reconcile";
import type { Report } from "./types";
import type { GeneratedData } from "./generateData";

export interface ReportBundle {
  report: Report;
  data: GeneratedData;
}

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
