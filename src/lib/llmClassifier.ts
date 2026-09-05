import type { Exception, ExceptionCategory, SettlementLine, Order } from "./types";
import { callLLMForJSON } from "./llmProvider";

const VALID_CATEGORIES: readonly ExceptionCategory[] = [
  "DUPLICATE",
  "REFUND",
  "ROUNDING",
  "UNEXPLAINED",
];

interface BatchContext {
  settlementId: string;
  utr: string;
  batchLineCount: number;
  batchTotalCredit: number;
  nearbyOrderAmounts: number[];
}

function buildPrompt(exception: Exception, ctx: BatchContext): string {
  return `You are a financial reconciliation analyst reviewing a Razorpay settlement exception that a rule-based system could NOT confidently classify.

Exception details:
- Category guessed by rules: ${exception.category}
- Amount: ₹${exception.amount}
- Settlement batch: ${ctx.settlementId} (UTR ${ctx.utr})
- This batch contains ${ctx.batchLineCount} settlement lines totalling ₹${ctx.batchTotalCredit}
- Order amounts elsewhere in this same batch, for context: ${ctx.nearbyOrderAmounts.slice(0, 8).join(", ")}
- Rule engine's note: ${exception.explanation}

Classify this exception into exactly one of: DUPLICATE, REFUND, ROUNDING, UNEXPLAINED. These are the only four categories this system recognizes -- do not invent others.

Reason about whether the amount plausibly matches a partial refund pattern against a nearby order, a rounding/currency artifact, a duplicate settlement, or is genuinely inexplicable given the context. Assign a confidence (0-1) reflecting how sure you actually are -- don't inflate it. Write one sentence explaining your reasoning in plain language a small business owner could understand, and one sentence with a concrete suggested next action. Only reference an order_id in your explanation if it was given to you above -- never invent one.

Respond with ONLY a JSON object, no other text, no markdown fences:
{"category": "...", "confidence": 0.0, "explanation": "...", "suggested_action": "..."}`;
}

type VerifiedResult =
  | {
      valid: true;
      category: ExceptionCategory;
      confidence: number;
      explanation: string;
      suggested_action: string;
    }
  | { valid: false; reason: string };

const ORDER_ID_PATTERN = /order_[A-Za-z0-9]{6,}/g;

export function verifyReasonedResult(
  result: Record<string, unknown>,
  allOrders: Order[]
): VerifiedResult {
  const { category, confidence, explanation, suggested_action } = result;

  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as ExceptionCategory)
  ) {
    return { valid: false, reason: `invalid category: ${JSON.stringify(category)}` };
  }

  if (
    typeof confidence !== "number" ||
    Number.isNaN(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return { valid: false, reason: `invalid confidence: ${JSON.stringify(confidence)}` };
  }

  if (typeof explanation !== "string" || !explanation.trim()) {
    return { valid: false, reason: "missing or empty explanation" };
  }

  const realOrderIds = new Set(allOrders.map((o) => o.order_id));
  const mentionedOrderIds = explanation.match(ORDER_ID_PATTERN) ?? [];
  for (const id of mentionedOrderIds) {
    if (!realOrderIds.has(id)) {
      return {
        valid: false,
        reason: `explanation references order ${id}, which doesn't exist in the ledger`,
      };
    }
  }

  return {
    valid: true,
    category: category as ExceptionCategory,
    confidence,
    explanation,
    suggested_action: typeof suggested_action === "string" ? suggested_action : "",
  };
}

export async function reasonAboutException(
  exception: Exception,
  allLines: SettlementLine[],
  allOrders: Order[]
): Promise<Exception> {
  try {
    const batchLines = allLines.filter(
      (l) => l.settlement_id === exception.settlement_id
    );
    const ctx: BatchContext = {
      settlementId: exception.settlement_id,
      utr: batchLines[0]?.settlement_utr ?? "",
      batchLineCount: batchLines.length,
      batchTotalCredit: Math.round(
        batchLines.reduce((s, l) => s + l.credit / 100, 0)
      ),
      nearbyOrderAmounts: batchLines
        .map((l) => allOrders.find((o) => o.order_id === l.order_id)?.order_amount)
        .filter((a): a is number => typeof a === "number"),
    };

    const result = await callLLMForJSON(buildPrompt(exception, ctx));
    const verified = verifyReasonedResult(result, allOrders);

    if (!verified.valid) {
      return { ...exception, verification_failed: true, verification_failure_reason: verified.reason };
    }

    return {
      ...exception,
      category: verified.category,
      confidence: verified.confidence,
      explanation: verified.explanation,
      suggested_action: verified.suggested_action || exception.suggested_action,
      ai_reasoned: true,
    };
  } catch (err) {
    console.warn("reasonAboutException: LLM call failed, keeping rule-based classification", err);
    return exception;
  }
}

export async function reasonAboutLowConfidenceExceptions(
  exceptions: Exception[],
  allLines: SettlementLine[],
  allOrders: Order[]
): Promise<Exception[]> {
  const results: Exception[] = [];
  for (const e of exceptions) {
    results.push(
      e.confidence < 0.6 ? await reasonAboutException(e, allLines, allOrders) : e
    );
  }
  return results;
}
