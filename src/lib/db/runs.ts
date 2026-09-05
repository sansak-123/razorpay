import { createClient } from "@/lib/supabase/server";
import { getReportBundle, computeReportBundle } from "@/lib/getReport";
import type { Report } from "@/lib/types";
import type { GeneratedData } from "@/lib/generateData";

export interface RunRow {
  id: string;
  provider: string;
  report: Report;
  data: GeneratedData;
  created_at: string;
}

export async function getLatestRun(userId: string): Promise<RunRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliation_runs")
    .select("id, provider, report, data, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as RunRow | null;
}

export async function saveRun(
  userId: string,
  provider = "razorpay",
  { fresh = false }: { fresh?: boolean } = {}
): Promise<RunRow> {
  const bundle = fresh ? await computeReportBundle() : await getReportBundle();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reconciliation_runs")
    .insert({ user_id: userId, provider, report: bundle.report, data: bundle.data })
    .select("id, provider, report, data, created_at")
    .single();

  if (error) throw error;
  return data as RunRow;
}

export async function getOrCreateLatestRun(userId: string): Promise<RunRow> {
  const existing = await getLatestRun(userId);
  if (existing) return existing;
  return saveRun(userId);
}
