import type { Report, Exception, Order, SettlementLine } from "./types";
import { callLLMForText, LLMNotConfiguredError } from "./llmProvider";

// --- Why "structured retrieval," not "RAG" ----------------------------------
// The dataset here is small (tens to hundreds of records) and fully
// structured -- exact fields, not free text. Building a vector index over it
// would add a real dependency (an embedding provider, a similarity search
// step) for no benefit a set of direct, exact lookups doesn't already give
// you at this scale. So retrieval here means: pull the specific records the
// question is actually about -- by order ID, by category, by keyword -- and
// hand exactly those to the LLM with an instruction to answer only from what
// it was given. That's a real, honest distinction worth keeping in any
// pitch/docs: this is grounded retrieval, not RAG, and claiming otherwise
// would be the kind of overclaim the ai_reasoned badge elsewhere in this app
// exists specifically to avoid.

const CATEGORY_KEYWORDS: Record<string, Exception["category"]> = {
  duplicate: "DUPLICATE",
  duplicated: "DUPLICATE",
  refund: "REFUND",
  refunded: "REFUND",
  round: "ROUNDING",
  rounding: "ROUNDING",
  dust: "ROUNDING",
  unexplained: "UNEXPLAINED",
  mystery: "UNEXPLAINED",
  missing: "UNEXPLAINED",
};

function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function formatException(e: Exception): string {
  const ref = e.order_id || `batch ${e.settlement_id.slice(0, 14)}…`;
  const tag = e.ai_reasoned ? "AI-reasoned" : "Rule-matched";
  return `- [${e.category}] ${ref}: ${rupees(e.amount)}, confidence ${Math.round(e.confidence * 100)}% (${tag}). ${e.explanation} → ${e.suggested_action}`;
}

// Structured retrieval, tried in priority order -- the first rule that
// matches the question wins, so a question mentioning both an order ID and
// "refund" still gets the more specific order-level answer.
function retrieveContext(
  question: string,
  report: Report,
  orders: Order[],
  settlementLines: SettlementLine[]
): string {
  const q = question.toLowerCase();

  // 1. Order ID mention -- pull that order, every settlement line touching
  // it, and any exception tied to it. Accepts a full or partial ID after
  // the word "order" (IDs look like order_WsGYdEDsZoDqWj).
  const orderMatch = question.match(/order[_\s]?([A-Za-z0-9]{6,})/i);
  if (orderMatch) {
    const needle = orderMatch[1].toLowerCase();
    const order = orders.find((o) => o.order_id.toLowerCase().includes(needle));
    const lines = settlementLines.filter((l) =>
      l.order_id.toLowerCase().includes(needle)
    );
    const exceptions = report.exceptions.filter((e) =>
      e.order_id.toLowerCase().includes(needle)
    );

    if (order || lines.length || exceptions.length) {
      const parts = [`ORDER ${order?.order_id ?? `(matching "${orderMatch[1]}")`}:`];
      if (order) {
        parts.push(
          `  Amount ${rupees(order.order_amount)}, method ${order.method}, status ${order.status}, created ${order.created_at}.`
        );
      } else {
        parts.push(`  No order in the ledger matches this ID.`);
      }
      for (const l of lines) {
        parts.push(
          `  Settlement line (${l.type}) in batch ${l.settlement_id}: credit ₹${(l.credit / 100).toFixed(2)}, debit ₹${(l.debit / 100).toFixed(2)}, fee ₹${(l.fee / 100).toFixed(2)}, tax ₹${(l.tax / 100).toFixed(2)}.`
        );
      }
      if (exceptions.length) {
        parts.push(`  Exceptions logged against this order:`);
        parts.push(...exceptions.map(formatException));
      } else if (order) {
        parts.push(`  No exceptions logged against this order -- it matched cleanly.`);
      }
      return parts.join("\n");
    }
  }

  // 2. Category keyword -- pull every exception in that category.
  for (const [kw, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (q.includes(kw)) {
      const matches = report.exceptions.filter((e) => e.category === category);
      const bucket = report.exceptions_by_category[category];
      return [
        `CATEGORY ${category}: ${bucket?.count ?? 0} exceptions totalling ${rupees(bucket?.amount ?? 0)}.`,
        ...matches.map(formatException),
      ].join("\n");
    }
  }

  // 3. GST / tax / ITC keyword -- pull the tax summary figures directly.
  if (/\b(gst|tax|itc|input tax credit)\b/i.test(question)) {
    const s = report.summary;
    return [
      `TAX SUMMARY:`,
      `  Total tax deducted across all settlements: ${rupees(s.total_tax_deducted)}.`,
      `  GST input tax credit claimable: ${rupees(s.gst_itc_claimable)}.`,
      `  GST input tax credit at risk (fee's tax not itemised): ${rupees(s.gst_itc_at_risk)}.`,
      `  Total MDR fee deducted: ${rupees(s.total_fee_deducted)}.`,
    ].join("\n");
  }

  // 4. Match rate / totals keyword -- pull the top-line summary counts.
  if (/\b(match rate|matched|total orders|how many orders|overview|summary)\b/i.test(question)) {
    const s = report.summary;
    return [
      `SUMMARY:`,
      `  ${s.matched_orders} of ${s.total_orders} orders matched (${s.match_rate_pct}%), vs. a ${s.baseline_manual_match_rate_pct}% manual baseline.`,
      `  ${s.total_exceptions} exceptions logged, ${s.unresolved_exceptions} still need human review.`,
      `  ${s.ai_reasoned_count} of those exceptions were reasoned live by Claude; the rest were confident rule matches.`,
      `  Money surfaced (duplicates + unexplained gaps): ${rupees(s.money_surfaced_by_agent)}.`,
    ].join("\n");
  }

  // 5. Fallback -- no specific match, so hand over the highest-value
  // exceptions instead of nothing. There's always SOME real context, even
  // for a vague question, and the prompt below still forbids inventing
  // anything beyond it.
  const top = [...report.exceptions].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return [
    `No specific order/category/tax match for this question. Here are the ` +
      `5 highest-value exceptions on record, in case one is relevant:`,
    ...top.map(formatException),
  ].join("\n");
}

function buildPrompt(question: string, context: string): string {
  return `You are answering a merchant's question about their own Razorpay settlement reconciliation. You have been given the ONLY data you're allowed to use -- retrieved directly from their actual reconciliation report, not the full dataset.

Retrieved data:
${context}

Question: ${question}

Answer using ONLY the retrieved data above. Do not invent order IDs, amounts, or explanations that aren't in it. If the retrieved data doesn't actually answer the question, say so plainly and suggest what to ask instead (e.g. "mention a specific order ID" or "ask about GST"). Keep the answer to 2-4 sentences, plain language, no markdown headers. Use ₹ for amounts exactly as given.`;
}

/**
 * Answers a merchant's natural-language question about their settlement
 * report. Retrieval is structured (see above), not vector search. Falls
 * back to the raw retrieved context, unpolished, if no LLM key is
 * configured -- still genuinely useful, just not narrated -- rather than
 * failing the request outright.
 */
export async function answerSettlementQuestion(
  question: string,
  report: Report,
  orders: Order[],
  settlementLines: SettlementLine[]
): Promise<{ answer: string; aiAnswered: boolean }> {
  const context = retrieveContext(question, report, orders, settlementLines);

  try {
    const answer = await callLLMForText(buildPrompt(question, context));
    return { answer: answer.trim(), aiAnswered: true };
  } catch (err) {
    if (err instanceof LLMNotConfiguredError) {
      return {
        answer: `No AI key configured, so here's the raw matching data instead:\n\n${context}`,
        aiAnswered: false,
      };
    }
    // A real call failure (network/parse) -- still surface the retrieved
    // data rather than a bare error, same graceful-degradation principle
    // as llmClassifier.ts.
    return {
      answer: `The AI reasoning call failed, so here's the raw matching data instead:\n\n${context}`,
      aiAnswered: false,
    };
  }
}
