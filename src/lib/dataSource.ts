import { generateData } from "./generateData";
import { fetchLiveSettlementData } from "./liveData";
import type { GeneratedData } from "./generateData";

export async function getSettlementData(): Promise<GeneratedData> {
  const useLive = process.env.RAZORPAY_LIVE_MODE === "true";
  if (useLive) {
    return fetchLiveSettlementData();
  }
  return generateData();
}
