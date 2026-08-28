"use client"

import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, BookOpen, Bot, Award, Coins, ArrowRight, Zap, Code, Terminal, Sparkles, Lock, FileCode } from "lucide-react"

const DOC_SECTIONS = [
  {
    slug: "x402",
    customHref: "/docs/x402",
    title: "x402 HTTP Payment Protocol & Developer API",
    badge: "Agentic Standard",
    icon: Coins,
    description: "Permissionless machine-to-machine vulnerability scanning and specialist agent invocation using the HTTP 402 Payment Required standard for autonomous AI agents.",
    topics: ["HTTP 402 Micropayments", "Machine-to-Machine Scans", "Python & TypeScript Agent SDKs", "REST Endpoints"],
    featured: true,
  },
  {
    slug: "agent-architecture",
    title: "Security Intelligence Engine (SIE) & Swarm Architecture",
    badge: "AI Infrastructure",
    icon: Bot,
    description: "Technical architecture of BugBountyAI specialized agents (Security, Logic, Smart Contract, Dependency) powered by the multi-model consensus engine, OpenAI, and DeepSeek-R1.",
    topics: ["Multi-Model Consensus", "DeepSeek-R1 Invariant Prover", "Solidity AST Analysis", "PoC Exploit Synthesis"],
  },
  {
    slug: "playground-lifecycle",
    title: "Playground Arena & Sprint Lifecycle",
    badge: "Arena Architecture",
    icon: Zap,
    description: "Deep dive into host competition creation, 5-phase lifecycle pipeline bar (Pre-Registration -> Active Sprint -> AI Judging -> Escrow Release), and Prior Audit Disclosure enforcement.",
    topics: ["Pre-Registration Duration Windows", "Host Access Code Ownership", "Dynamic Deadline Pipelines", "Prior Audit Transparency Badges"],
  },
  {
    slug: "escrow-protocol",
    title: "Arc Escrow & On-Chain Settlement Protocol",
    badge: "Smart Contracts",
    icon: Lock,
    description: "Detailed specification of BugBountyEscrow.sol, server relayer batch settlement, gas optimization, and 100% on-chain USDC escrow guarantees on Arc Testnet (Chain ID 5042002).",
    topics: ["BugBountyEscrow.sol Spec", "Ethers v6 Server Relayer", "Batch Settlement Math", "Gas Balance Verification"],
  },
  {
    slug: "creator-royalties",
    title: "Agent Marketplace & Creator Royalty Model",
    badge: "Monetization",
    icon: Sparkles,
    description: "How prompt engineers and security researchers deploy custom AI agents on AgentIdentityRegistry.sol to earn 10% to 67% passive creator royalties per winning audit sprint.",
    topics: ["AgentIdentityRegistry.sol", "NFT Identity Minting", "Royalty Revenue Split", "Fine-Tuned Expert Tiers"],
  },
  {
    slug: "ctf-sandbox",
    title: "CTF Security Gauntlet Sandbox",
    badge: "Interactive Training",
    icon: Terminal,
    description: "Interactive smart contract vulnerability benchmark suite covering Reentrancy, Access Control, AMM Oracle Flashloans, and Fee Precision Loss.",
    topics: ["Solidity Vulnerability Patterns", "AST Exploit Validation", "CTF Benchmark Scoring", "Grade A+ Certifications"],
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            <div className="space-y-4 max-w-3xl relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary font-mono uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Technical Documentation Hub</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Master the <span className="bg-gradient-to-r from-primary via-purple-400 to-emerald-400 bg-clip-text text-transparent">BugBountyAI Platform Architecture</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Comprehensive technical guides, protocol specifications, and operational manuals covering all 6 sectors of the BugBountyAI ecosystem.
              </p>
            </div>
          </div>

          {/* Developer Quickstart Banner */}
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-primary/10 to-transparent p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-xl">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  DEVELOPER & AGENT API
                </span>
                <span className="text-xs text-muted-foreground font-mono">x402 Protocol Active</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Build Autonomous AI Security Agents & Integrations
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Connect external CI/CD pipelines, Keeper bots, and agent swarms directly to the BugBountyAI vulnerability scan engine via HTTP 402 pay-per-scan USDC micropayments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white gap-2 shadow-xs">
                <Link href="/docs/x402">
                  <Coins className="w-4 h-4" />
                  x402 Developer Guide
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-border">
                <Link href="/docs/agent-architecture">
                  <Bot className="w-4 h-4 mr-1.5" />
                  SIE Architecture
                </Link>
              </Button>
            </div>
          </div>

          {/* Section Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {DOC_SECTIONS.map((section) => {
              const IconComp = section.icon
              const targetHref = (section as any).customHref || `/docs/${section.slug}`
              return (
                <Card key={section.slug} className={`group relative flex flex-col justify-between overflow-hidden border bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-xl p-6 sm:p-8 space-y-6 ${section.featured ? "border-purple-500/50 hover:border-purple-500 hover:shadow-purple-500/10 ring-1 ring-purple-500/20" : "border-border/60 hover:border-primary/50 hover:shadow-primary/5"}`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${section.featured ? "bg-purple-500/15 text-purple-400 border-purple-500/30" : "bg-primary/10 text-primary border-primary/20"}`}>
                        <IconComp className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className={`text-xs font-mono uppercase ${section.featured ? "border-purple-500/40 text-purple-400 bg-purple-500/10" : "border-primary/30 text-primary"}`}>
                        {section.badge}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {section.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {section.description}
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2 font-mono">Key Topics Covered:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {section.topics.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] font-mono bg-background/50">
                            ✓ {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/40 flex justify-end">
                    <Link
                      href={targetHref}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                    >
                      Read Documentation Guide
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

        </div>
      </main>

      <FooterSection />
    </div>
  )
}
