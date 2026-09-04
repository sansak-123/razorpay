import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// next/font self-hosts these at build time -- the browser never makes a
// request to fonts.googleapis.com, so there's no runtime network
// dependency despite using Google-sourced font files. Each font exposes a
// CSS variable that globals.css's @theme block maps to the font-display /
// font-sans / font-mono tokens the rest of the app already uses, so no
// component needed to change.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
// Landing-page-only headline font -- deliberately NOT wired into
// --font-display (that stays Fraunces for the dashboard's own voice). The
// marketing page has a different register (bold geometric grotesk, not the
// ledger's serif) so it gets its own token, applied selectively.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unsettle",
  description:
    "Order-level reconciliation for lumped Razorpay net settlements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-full flex flex-col bg-ink-900 text-text font-sans">
        {children}
      </body>
    </html>
  );
}
