import type { Metadata } from "next";
import { getReport } from "@/lib/getReport";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Unsettle — Fully unpacked",
  description: "Order-level reconciliation for lumped Razorpay net settlements.",
};

export default async function RootPage() {
  const report = await getReport();
  return <LandingPage report={report} />;
}
