import { generateData } from "./generateData";
import { fetchLiveSettlementData } from "./liveData";
import type { GeneratedData } from "./generateData";

// This is the ONE place in the whole app that decides "synthetic or real
// data" -- everything downstream (SettlementUnpacker, the dashboard) just
// consumes a GeneratedData object and doesn't know or care which source
// produced it. That's the payoff of designing generateData() and
// fetchLiveSettlementData() to return the exact same shape: swapping the
// data source is a one-line change here, not a rewrite of the app.
export async function getSettlementData(): Promise<GeneratedData> {
  const useLive = process.env.RAZORPAY_LIVE_MODE === "true";
  if (useLive) {
    return fetchLiveSettlementData();
  }
  return generateData();
}
