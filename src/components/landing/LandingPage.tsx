import type { Report } from "@/lib/types";
import { LandingNav } from "./LandingNav";
import { Hero } from "./Hero";
import { CredibilityBar } from "./CredibilityBar";
import { ReceiptTeaser } from "./ReceiptTeaser";
import { CategoryMarquee } from "./CategoryMarquee";
import { StatSection } from "./StatSection";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";

// Marketing/pitch page at "/" -- purely additive, does not replace the
// dashboard (moved to /app). Uses the same cached getReport() every
// dashboard page reads from, so every number here is real, not a
// landing-page-only fabrication.
export function LandingPage({ report }: { report: Report }) {
  return (
    <div className="bg-navy-900 min-h-screen overflow-x-hidden">
      <LandingNav />
      <Hero />
      <CredibilityBar />
      <ReceiptTeaser report={report} />
      <CategoryMarquee />
      <StatSection report={report} />
      <HowItWorks />
      <LandingFooter />
    </div>
  );
}
