"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-6">
      <div className="w-full max-w-sm text-center">
        <div
          className="text-[17px] font-semibold text-landing-white mb-8"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Unsettle
        </div>
        <h1
          className="text-landing-white font-medium mb-3"
          style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}
        >
          Sign in to see your settlements
        </h1>
        <p className="text-[16px] text-landing-text-dim mb-8 leading-relaxed">
          Your reconciliation runs and chat history are tied to your account
          — nobody else can see them.
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-full bg-blue px-6 py-3.5 text-[16.5px] font-semibold text-navy-900 transition-all hover:shadow-[0_0_0_1px_var(--color-blue),0_8px_28px_-8px_var(--color-blue)]"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.27-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
