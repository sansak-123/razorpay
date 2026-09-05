import type { Report } from "./types";

export interface Recommendation {
  priority: number;
  title: string;
  detail: string;
  impactRupees: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function buildRecommendations(report: Report): Recommendation[] {
  const { summary, exceptions } = report;
  const recs: Recommendation[] = [];

  if (summary.gst_itc_at_risk > 0) {
    recs.push({
      priority: 1,
      title: "Get GST itemised on your MDR fee",
      detail: `₹${round2(summary.gst_itc_at_risk)} in input tax credit is at risk because some settlement lines don't break GST on the fee out separately. Ask your payment processor to itemise it — this is credit you can likely still claim once it is.`,
      impactRupees: summary.gst_itc_at_risk,
    });
  }

  const duplicates = exceptions.filter((e) => e.category === "DUPLICATE");
  if (duplicates.length > 0) {
    const total = round2(duplicates.reduce((s, e) => s + e.amount, 0));
    recs.push({
      priority: 1,
      title: `Exclude ${duplicates.length} duplicate settlement${duplicates.length > 1 ? "s" : ""} from revenue`,
      detail: `₹${total} was settled twice. Raise these with your payment processor's support, quoting the settlement IDs, before they get booked as extra revenue.`,
      impactRupees: total,
    });
  }

  const unresolved = exceptions.filter((e) => e.confidence < 0.6);
  if (unresolved.length > 0) {
    const total = round2(unresolved.reduce((s, e) => s + e.amount, 0));
    recs.push({
      priority: 2,
      title: `Review ${unresolved.length} low-confidence exception${unresolved.length > 1 ? "s" : ""}`,
      detail: `₹${total} across exceptions the system is genuinely unsure about — these need a human decision, not more automation.`,
      impactRupees: total,
    });
  }

  const unmatchedCount = summary.total_orders - summary.matched_orders;
  if (unmatchedCount > 0) {
    recs.push({
      priority: 3,
      title: `${unmatchedCount} order${unmatchedCount > 1 ? "s" : ""} not yet in any settlement`,
      detail: "These haven't appeared in a settlement batch yet. If they're old, check payout timing with your processor.",
      impactRupees: 0,
    });
  }

  if (recs.length === 0) {
    recs.push({
      priority: 9,
      title: "Nothing urgent right now",
      detail: "No duplicate settlements, no GST credit at risk, and every exception already has a resolved classification.",
      impactRupees: 0,
    });
  }

  return recs.sort((a, b) => a.priority - b.priority || b.impactRupees - a.impactRupees);
}
