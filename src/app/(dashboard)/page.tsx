import { getReport } from "@/lib/getReport";
import { OverviewSummary } from "@/components/overview/OverviewSummary";

export default async function OverviewPage() {
  const report = await getReport();
  return <OverviewSummary report={report} />;
}
