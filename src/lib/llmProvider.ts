// Shared LLM-calling layer, extracted out of llmClassifier.ts so a second
// caller (qaAgent.ts, the Settlement Q&A chat) doesn't duplicate the
// provider-auth/parsing logic. OpenRouter only, deliberately -- one API key,
// any model behind it, and the exact model is picked by whoever configures
// the deployment (OPENROUTER_MODEL in .env.local), not hardcoded here.
// OpenRouter speaks the OpenAI-style chat/completions schema.

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Thrown specifically when no key is configured, so callers can tell
// "not set up" apart from "the call failed" and degrade differently for
// each (see qaAgent.ts, which falls back to raw retrieved data on this one
// but not on a network/parse failure).
export class LLMNotConfiguredError extends Error {
  constructor() {
    super(
      "OPENROUTER_API_KEY is not set. Add it to .env.local to enable " +
        "AI-reasoned classification and the Q&A chat."
    );
    this.name = "LLMNotConfiguredError";
  }
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status} (model: ${model}): ${body}`);
  }

  const data = await res.json();
  // OpenAI-compatible shape: choices[0].message.content, not content[].text.
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter API returned no message content: " + JSON.stringify(data));
  }
  return text as string;
}

/** Raw text completion -- for prose answers (the Q&A chat). */
export async function callLLMForText(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new LLMNotConfiguredError();
  }
  return callOpenRouter(prompt, apiKey);
}

/** JSON completion -- for structured classification (llmClassifier.ts). */
export async function callLLMForJSON(prompt: string): Promise<Record<string, unknown>> {
  const text = await callLLMForText(prompt);
  // Defensive parse: prompts ask for raw JSON, but strip code fences just
  // in case the model wraps it anyway.
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
