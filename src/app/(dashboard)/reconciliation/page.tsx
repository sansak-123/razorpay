import type { Metadata } from "next";
import { getReport } from "@/lib/getReport";
import { ReconciliationLog } from "@/components/reconciliation/ReconciliationLog";

export const metadata: Metadata = { title: "Reconciliation Log · Settlement Unpacker" };

export default async function ReconciliationPage() {
  const report = await getReport();
  return <ReconciliationLog report={report} />;
}
