import type { Report } from "@/lib/types";
import { LandingNav } from "./LandingNav";
import { Hero } from "./Hero";
import { FeatureGrid } from "./FeatureGrid";
import { ReceiptTeaser } from "./ReceiptTeaser";
import { CategoryMarquee } from "./CategoryMarquee";
import { StatSection } from "./StatSection";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";
import { FloatingCTA } from "./FloatingCTA";

export function LandingPage({ report }: { report: Report }) {
  return (
    <div className="bg-navy-900 min-h-screen overflow-x-hidden">
      <LandingNav />
      <Hero />
      <FeatureGrid />
      <ReceiptTeaser report={report} />
      <CategoryMarquee />
      <StatSection report={report} />
      <HowItWorks />
      <LandingFooter />
      <FloatingCTA />
    </div>
  );
}
