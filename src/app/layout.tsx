import type { Metadata } from "next";
import "./globals.css";

// We use plain CSS font stacks (declared in globals.css) instead of
// next/font/google here. next/font is normally the better choice -- it
// self-hosts fonts at build time for zero runtime requests -- but it needs
// network access to fonts.googleapis.com during the build itself, which
// isn't guaranteed in every environment (e.g. a sandboxed CI runner). A
// system font stack has zero network dependency and still looks clean, and
// it's a one-line swap back to next/font once you're building somewhere
// with open internet access (e.g. Vercel).

export const metadata: Metadata = {
  title: "Settlement Unpacker",
  description:
    "Order-level reconciliation for lumped Razorpay net settlements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink-900 text-text font-sans">
        {children}
      </body>
    </html>
  );
}
