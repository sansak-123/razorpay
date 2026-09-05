const DEFAULT_MODEL = "minimax/minimax-m3:free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export class LLMNotConfiguredError extends Error {
  constructor() {
    super(
      "OPENROUTER_API_KEY is not set. Add it to .env.local to enable " +
        "AI-reasoned classification and the Q&A chat."
    );
    this.name = "LLMNotConfiguredError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce(prompt: string, apiKey: string, model: string): Promise<Response> {
  return fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  let res = await requestOnce(prompt, apiKey, model);
  if (res.status === 429) {
    console.warn(`OpenRouter rate-limited (model: ${model}), retrying once in 3s`);
    await sleep(3000);
    res = await requestOnce(prompt, apiKey, model);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter API error ${res.status} (model: ${model}): ${body}`);
  }

  const data = await res.json();

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter API returned no message content: " + JSON.stringify(data));
  }
  return text as string;
}

export async function callLLMForText(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new LLMNotConfiguredError();
  }
  return callOpenRouter(prompt, apiKey);
}

export async function callLLMForJSON(prompt: string): Promise<Record<string, unknown>> {
  const text = await callLLMForText(prompt);

  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in LLM response: " + cleaned.slice(0, 200));
  }
  return JSON.parse(match[0]);
}
