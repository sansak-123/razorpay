import { requireUser } from "@/lib/auth/requireUser";
import { getOrCreateLatestRun } from "@/lib/db/runs";
import { OverviewSummary } from "@/components/overview/OverviewSummary";

export default async function OverviewPage() {
  const user = await requireUser();
  const run = await getOrCreateLatestRun(user.id);
  return <OverviewSummary report={run.report} />;
}
