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
import { BlogSection } from "@/components/landing/blog-section";
import { DocsSection } from "@/components/landing/docs-section";
import { FooterSection } from "@/components/landing/footer-section";
import { AgentRegistryPanel } from "@/components/dashboard/agent-registry-panel";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <Navigation />
      <HeroSection />
      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-mono uppercase tracking-[0.35em] text-muted-foreground">
              Agent onboarding
            </p>
            <h2 className="text-3xl font-display tracking-tight sm:text-4xl">
              Register and manage your trained agents in one place
            </h2>
            <p className="text-lg text-muted-foreground">
              Bring your custom agents onto the homepage, keep them visible, and use them in future audits without bouncing between dashboards.
            </p>
          </div>
          <AgentRegistryPanel />
        </div>
      </section>
      <AgentsSection />
      <HowItWorksSection />
      <AuditSwarmSection />
      <FindingsSection />
      <RewardsEngineSection />
      <ArcSettlementSection />
      <CircleAgentStackSection />
      <LeaderboardSection />
      <LiveMetricsSection />
      <BlogSection />
      <DocsSection />
      <FutureMarketplaceSection />
      <FooterSection />
    </main>
  );
}
