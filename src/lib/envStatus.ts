// Server-only status booleans for the Data Source settings page and the
// TopBar pill. Deliberately returns presence flags, never the secret values
// themselves -- this file's whole job is to be safe to pass into a Server
// Component's render output.

export interface EnvStatus {
  liveMode: boolean;
  anthropicKeyConfigured: boolean;
  openrouterKeyConfigured: boolean;
  razorpayKeyConfigured: boolean;
  activeLlmProvider: "anthropic" | "openrouter" | null;
}

export function getEnvStatus(): EnvStatus {
  const anthropicKeyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const openrouterKeyConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  return {
    liveMode: process.env.RAZORPAY_LIVE_MODE === "true",
    anthropicKeyConfigured,
    openrouterKeyConfigured,
    razorpayKeyConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
    activeLlmProvider: anthropicKeyConfigured
      ? "anthropic"
      : openrouterKeyConfigured
        ? "openrouter"
        : null,
  };
}
