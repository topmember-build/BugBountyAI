import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { AgentsSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { AuditSwarmSection } from "@/components/landing/infrastructure-section";
import { FindingsSection } from "@/components/landing/integrations-section";
import { RewardsEngineSection } from "@/components/landing/pricing-section";
import { ArcSettlementSection } from "@/components/landing/developers-section";
import { CircleAgentStackSection } from "@/components/landing/security-section";
import { LeaderboardSection } from "@/components/landing/testimonials-section";
import { LiveMetricsSection } from "@/components/landing/metrics-section";
import { FutureMarketplaceSection } from "@/components/landing/cta-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <Navigation />
      <HeroSection />
      <AgentsSection />
      <HowItWorksSection />
      <AuditSwarmSection />
      <FindingsSection />
      <RewardsEngineSection />
      <ArcSettlementSection />
      <CircleAgentStackSection />
      <LeaderboardSection />
      <LiveMetricsSection />
      <FutureMarketplaceSection />
      <FooterSection />
    </main>
  );
}
