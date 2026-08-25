import type { Exception, SettlementLine, Order } from "./types";

// --- Why this file exists ---------------------------------------------------
// Everything in reconcile.ts is deterministic: fixed thresholds (amt <= 1.0
// -> ROUNDING), fixed lookups (order_id found -> matched). That's correct
// and fast for the cases it covers, but it's a matching SCRIPT, not an AI
// agent -- there's no judgment involved. Real judgment is needed precisely
// where the rules run out: the low-confidence UNEXPLAINED cases where a
// human accountant would look at the surrounding context (amount, timing,
// nearby orders in the same batch) and reason about what probably happened,
// rather than apply a single threshold.
//
// This module sends exactly those low-confidence cases to Claude, with the
// surrounding batch context, and asks for a reasoned re-classification with
// its own confidence and explanation -- genuinely different output than the
// rule engine could produce, because it can weigh multiple weak signals
// together the way a human reviewer would.

const CLAUDE_MODEL = "claude-sonnet-4-6";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4.5"; // OpenRouter's naming for the same model family
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ReasonedResult {
  category: Exception["category"];
  confidence: number;
  explanation: string;
  suggested_action: string;
  ai_reasoned: true;
}

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

Classify this exception into exactly one of: FEE_DEDUCTION, TAX_DEDUCTION, REFUND, ROUNDING, DUPLICATE, UNEXPLAINED.

Reason about whether the amount plausibly matches a partial refund pattern against a nearby order, a rounding/currency artifact, a fee/tax structure, or is genuinely inexplicable given the context. Assign a confidence (0-1) reflecting how sure you actually are -- don't inflate it. Write one sentence explaining your reasoning in plain language a small business owner could understand, and one sentence with a concrete suggested next action.

Respond with ONLY a JSON object, no other text, no markdown fences:
{"category": "...", "confidence": 0.0, "explanation": "...", "suggested_action": "..."}`;
}

// Two providers supported, auto-selected by whichever key is set --
// ANTHROPIC_API_KEY is tried first, OPENROUTER_API_KEY as a fallback. Both
// give you Claude; they just speak different request/response shapes.
// Anthropic's native API uses its own /v1/messages schema. OpenRouter is a
// model-routing proxy: one API key, many providers/models behind it, but it
// speaks the OpenAI-style chat/completions schema instead -- different
// field names for the same underlying request, and the model name is
// prefixed with the provider ("anthropic/claude-sonnet-4.5") since
// OpenRouter needs to know who to route the call to.
async function callClaude(prompt: string): Promise<Record<string, unknown>> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (anthropicKey) {
    return callAnthropic(prompt, anthropicKey);
  }
  if (openrouterKey) {
    return callOpenRouter(prompt, openrouterKey);
  }
  throw new Error(
    "Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is set. Add one to " +
      ".env.local to enable AI-reasoned classification."
  );
}

async function callAnthropic(
  prompt: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic API returned no text content: " + JSON.stringify(data));
  }
  return parseJsonFromText(textBlock.text);
}

async function callOpenRouter(
  prompt: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  // OpenAI-compatible shape: choices[0].message.content, not content[].text.
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter API returned no message content: " + JSON.stringify(data));
  }
  return parseJsonFromText(text);
}

function parseJsonFromText(text: string): Record<string, unknown> {
  // Defensive parse: the prompt asks for raw JSON, but strip code fences
  // just in case the model wraps it anyway.
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Re-reasons a single low-confidence exception through Claude. Falls back
 * to the original rule-based result (unchanged, with ai_reasoned omitted)
 * if no key is configured or the call fails -- this keeps the whole
 * pipeline working in synthetic/no-key demos, degrading gracefully rather
 * than crashing the report.
 */
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

    const result = await callClaude(buildPrompt(exception, ctx));

    return {
      ...exception,
      category: (result.category as Exception["category"]) ?? exception.category,
      confidence:
        typeof result.confidence === "number" ? result.confidence : exception.confidence,
      explanation: (result.explanation as string) ?? exception.explanation,
      suggested_action:
        (result.suggested_action as string) ?? exception.suggested_action,
      ai_reasoned: true,
    };
  } catch {
    // Graceful degradation: no key, network error, or bad JSON all fall
    // back to the original rule-based classification rather than breaking
    // the report. The caller can tell reasoning didn't run because
    // ai_reasoned stays undefined on the returned exception.
    return exception;
  }
}

/**
 * Runs AI reasoning over every low-confidence exception in a report,
 * concurrently. Only exceptions the rule engine was already unsure about
 * (confidence < 0.6) go through this -- clear-cut cases (a refund matched
 * to a real order, obvious rounding dust) don't need an LLM call, which
 * keeps latency and cost down and matches how a real finance team would
 * triage: don't re-review what's already confidently explained.
 */
export async function reasonAboutLowConfidenceExceptions(
  exceptions: Exception[],
  allLines: SettlementLine[],
  allOrders: Order[]
): Promise<Exception[]> {
  const results = await Promise.all(
    exceptions.map((e) =>
      e.confidence < 0.6
        ? reasonAboutException(e, allLines, allOrders)
        : Promise.resolve(e)
    )
  );
  return results;
}