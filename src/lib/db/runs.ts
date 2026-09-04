import { createClient } from "@/lib/supabase/server";
import { getReportBundle, computeReportBundle } from "@/lib/getReport";
import type { Report } from "@/lib/types";
import type { GeneratedData } from "@/lib/generateData";

// The reconciliation engine itself (getReportBundle -> generateData/
// liveData -> SettlementUnpacker) is completely unchanged -- this file only
// adds a persistence layer on top: compute via the existing pipeline, save
// the result under the signed-in user, read it back for display instead of
// recomputing fresh on every page load. Two different users reconciling the
// same synthetic seed (or the same shared Razorpay account) will get
// identical `report`/`data` content but two separate rows, each visible only
// to its own owner via RLS -- this is per-user *history*, not per-user
// *source data* (there's no per-user Razorpay credential in scope here).
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

/**
 * Computes and inserts a new run row. `fresh: true` (used by the explicit
 * "run reconciliation again" action) bypasses the shared pipeline cache
 * entirely via computeReportBundle() -- revalidateTag's stale-while-
 * revalidate semantics can't guarantee an immediately-fresh result, so an
 * explicit re-run has to skip the cache outright rather than fight it.
 * `fresh: false` (the auto-create-on-first-visit path) reuses the cached
 * computation, since "give the user something to look at" doesn't need a
 * guaranteed-fresh Claude call.
 */
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

/**
 * The read path every dashboard page uses: return the user's most recent
 * stored run, computing and saving a first one if they don't have any yet.
 * This is the one place the old "always recompute fresh" behavior changes
 * to "read persisted, or create once."
 */
export async function getOrCreateLatestRun(userId: string): Promise<RunRow> {
  const existing = await getLatestRun(userId);
  if (existing) return existing;
  return saveRun(userId);
}
