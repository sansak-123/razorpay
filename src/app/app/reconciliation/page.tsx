import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/requireUser";
import { getOrCreateLatestRun } from "@/lib/db/runs";
import { ReconciliationLog } from "@/components/reconciliation/ReconciliationLog";

export const metadata: Metadata = { title: "Reconciliation Log · Unsettle" };

export default async function ReconciliationPage() {
  const user = await requireUser();
  const run = await getOrCreateLatestRun(user.id);
  return <ReconciliationLog report={run.report} />;
}
