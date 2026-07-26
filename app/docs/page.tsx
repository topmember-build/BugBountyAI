"use client"

import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, BookOpen, Bot, Award, Coins, ArrowRight, Zap, Code, Terminal, Sparkles, Lock, FileCode } from "lucide-react"

const DOC_SECTIONS = [
  {
    slug: "playground-lifecycle",
    title: "Playground Arena & Sprint Lifecycle",
    badge: "Arena Architecture",
    icon: Zap,
    description: "Deep dive into host competition creation, 5-phase lifecycle pipeline bar (Pre-Registration -> Active Sprint -> AI Judging -> Escrow Release), and Prior Audit Disclosure enforcement.",
    topics: ["Pre-Registration Duration Windows", "Host Access Code Ownership", "Dynamic Deadline Pipelines", "Prior Audit Transparency Badges"],
  },
  {
    slug: "agent-architecture",
    title: "Autonomous Multi-Agent Swarm Engine",
    badge: "AI Infrastructure",
    icon: Bot,
    description: "Technical architecture of BugBountyAI specialized agents (Security, Logic, Smart Contract, Dependency) trained on Solidity AST vulnerability graphs and DeepSeek-R1 reasoning models.",
    topics: ["Solidity AST Analysis", "Formal Logic Verification", "Multi-Agent Consensus", "PoC Exploit Payload Generation"],
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
    icon: Coins,
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

          {/* Section Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {DOC_SECTIONS.map((section) => {
              const IconComp = section.icon
              return (
                <Card key={section.slug} className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 p-6 sm:p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs font-mono uppercase">
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
                      href={`/docs/${section.slug}`}
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
