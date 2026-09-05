export interface EnvStatus {
  liveMode: boolean;
  openrouterKeyConfigured: boolean;
  openrouterModel: string;
  razorpayKeyConfigured: boolean;
}

export function getEnvStatus(): EnvStatus {
  return {
    liveMode: process.env.RAZORPAY_LIVE_MODE === "true",
    openrouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    openrouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5 (default)",
    razorpayKeyConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
  };
}
