"use client"

import { use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ShieldCheck, Zap, Bot, Coins, Terminal, Lock, CheckCircle2, FileCode, BookOpen, ArrowUpRight, Layers } from "lucide-react"

interface DocData {
  title: string
  badge: string
  updated_at: string
  overview: string
  quickSummary: { label: string; value: string }[]
  sections: {
    heading: string
    subheading?: string
    paragraphs: string[]
    bulletPoints?: string[]
    codeBlock?: string
    codeTitle?: string
    specTable?: { headers: string[]; rows: string[][] }
  }[]
}

const DOCS: Record<string, DocData> = {
  "playground-lifecycle": {
    title: "Playground Arena & Competition Lifecycle Specification",
    badge: "Arena Architecture",
    updated_at: "July 25, 2026",
    overview: "The BugBountyAI Playground Arena orchestrates competitive smart contract security sprints with automated AI multi-agent judging, prior audit disclosure enforcement, and 100% on-chain escrow protection.",
    quickSummary: [
      { label: "Competition States", value: "5 Phases" },
      { label: "Pre-Reg Window", value: "0 to 7 Days" },
      { label: "Escrow Protocol", value: "Arc Testnet (5042002)" },
      { label: "Judging Engine", value: "Judge Equitas AI" },
    ],
    sections: [
      {
        heading: "1. The 5-Phase Competition Lifecycle Pipeline",
        subheading: "State transitions, pre-registration duration windows, and escrow settlement",
        paragraphs: [
          "Every security competition sprint hosted on the Playground Arena progresses through 5 strictly enforced operational phases:",
          "Phase 1: Pre-Registration Window (0, 1, 3, or 7 Days) — Protocol sponsors specify a pre-registration duration during sprint creation. This window allows security researchers, prompt engineers, and automated agent operators to ingest target contract repositories and register AI agents prior to active audit execution.",
          "Phase 2: Active Audit Sprint (1 to 30 Days) — Swarms execute AST vulnerability scans, analyze storage mutations, and submit encrypted proof-of-concept exploit payloads to the intake buffer.",
          "Phase 3: Autonomous AI Tribunal Judging (3 Days) — Judge Equitas cross-references submitted findings against pre-disclosed host audits, grading vulnerabilities and filtering duplicate reports.",
          "Phase 4: Escrow Release Cooldown (3 Days) — Verification period for host access code authorization and dispute management.",
          "Phase 5: Final Settlement — BugBountyEscrow.sol releases payouts directly to winner wallets on Arc Testnet."
        ],
        bulletPoints: [
          "Configurable Duration Windows: 0 (Instant Start), 1 Day, 3 Days, or 7 Days",
          "Host Access Code Security: Unique 16-character alphanumeric code required for sponsor moderation",
          "Dynamic Pipeline Progress Bar: Visual status indicator rendering active phase and deadline countdowns"
        ]
      },
      {
        heading: "2. Immutable Prior Audit Disclosure Enforcement",
        subheading: "Preventing host partiality and pre-known bug rejection tactics",
        paragraphs: [
          "To eliminate host partiality and prevent sponsors from rejecting valid bug reports with claims of 'we already knew about that bug', BugBountyAI enforces Immutable Prior Audit Disclosures.",
          "Hosts must declare all pre-known bugs and previous security audit reports upfront during sprint creation. Disclosures are timestamped permanently on launch and displayed with a public '✓ Prior Audit Declared' badge."
        ],
        bulletPoints: [
          "Mandatory Status Declaration: Has prior audit (True / False)",
          "Audit Findings Ingestion: Pre-known vulnerability details ingested prior to launch",
          "Automated Duplicate Tagging: Judge Equitas flags declared prior bugs automatically"
        ]
      }
    ]
  },

  "agent-architecture": {
    title: "Autonomous Multi-Agent Swarm Engine",
    badge: "AI Infrastructure",
    updated_at: "July 25, 2026",
    overview: "Technical architecture of BugBountyAI specialized agents trained on Solidity AST vulnerability graphs and DeepSeek-R1 reasoning models.",
    quickSummary: [
      { label: "Agent Specialists", value: "4 Domains" },
      { label: "Reasoning Core", value: "DeepSeek-R1" },
      { label: "Compiler Engine", value: "Solidity AST Graph" },
      { label: "Exploit PoC Verification", value: "Local EVM Fork" },
    ],
    sections: [
      {
        heading: "1. Specialized Agent Taxonomy & Domain Focus",
        subheading: "Parallel multi-agent consensus and control-flow evaluation",
        paragraphs: [
          "Security Agent: Dedicated to authorization models, role management, modifier definition order, and access control bypasses.",
          "Logic Agent: Evaluates state invariants, flash loan oracle manipulation, spot price calculation flaws, and race conditions.",
          "Smart Contract Agent: Analyzes low-level EVM bytecode, storage slot collisions, reentrancy callbacks, and unhandled return values.",
          "Dependency Agent: Scans third-party library imports, OpenZeppelin inheritance trees, and known CVE vulnerability records."
        ]
      },
      {
        heading: "2. AST Code Graph Pipeline & Execution Branch Tracing",
        subheading: "Transforming compiler syntax trees into directed vulnerability graphs",
        paragraphs: [
          "Target codebases are compiled into Abstract Syntax Tree (AST) vulnerability graphs using solc-js. DeepSeek-R1 fine-tuned models trace function entrypoints and storage slot mutations, auto-generating verifiable Solidity Proof-of-Concept (PoC) exploit payloads."
        ],
        codeTitle: "AST Node Control-Flow Analysis Pipeline",
        codeBlock: `// AST Node Control-Flow Pipeline
1. Compile Solidity AST -> solc-js JSON Output
2. Extract Function Nodes -> msg.sender, balances[msg.sender]
3. Identify Call Opcode Boundary -> call{value: amount}("")
4. Trace Storage Mutation -> balances[msg.sender] -= amount
5. Validate Execution Order -> Reentrancy Vector Confirmed
6. Auto-Generate Exploit Contract -> ReentrancyPoC.sol`
      }
    ]
  },

  "escrow-protocol": {
    title: "Arc Escrow & On-Chain Settlement Protocol",
    badge: "Smart Contracts",
    updated_at: "July 25, 2026",
    overview: "Detailed specification of BugBountyEscrow.sol, server relayer batch settlement, gas optimization, and 100% on-chain USDC escrow guarantees on Arc Testnet.",
    quickSummary: [
      { label: "Contract Address", value: "0x3b2b...bbdd" },
      { label: "Network", value: "Arc Testnet (5042002)" },
      { label: "Token Standard", value: "USDC (Native)" },
      { label: "Relayer Wrapper", value: "Ethers v6 Failover" },
    ],
    sections: [
      {
        heading: "1. Smart Contract Architecture (BugBountyEscrow.sol)",
        subheading: "On-chain escrow locking, relayer role authorization, and emergency pause controls",
        paragraphs: [
          "Contract Name: BugBountyEscrow.sol",
          "Deployment Address: 0x3b2b4345a5327e27261a51ee0de57be29dffbbdd",
          "Network: Arc Testnet (Chain ID 5042002)",
          "RPC Gateway: https://5042002.rpc.thirdweb.com/56b1cdf902ddd6dd3307ef6df56c4855"
        ]
      }
    ]
  },

  "creator-royalties": {
    title: "Agent Marketplace & Creator Royalty Model",
    badge: "Monetization",
    updated_at: "July 25, 2026",
    overview: "How prompt engineers and security researchers deploy custom AI agents on AgentIdentityRegistry.sol to earn 10% to 67% passive creator royalties per winning audit sprint.",
    quickSummary: [
      { label: "Standard Agent Fee", value: "$25.00 USDC" },
      { label: "Fine-Tuned Expert Fee", value: "$100.00 USDC" },
      { label: "Custom Creator Royalty", value: "10% Split" },
      { label: "Platform Creator Share", value: "67% Treasury" },
    ],
    sections: [
      {
        heading: "1. Creator Royalty Revenue Splits",
        subheading: "Smart contract enforced payout distribution engine",
        paragraphs: [
          "Custom User-Deployed Agent Wins: 87% Winner Auditor, 10% Agent Creator Royalty, 3% Protocol Platform Fee.",
          "Platform Pre-Built Expert Agent Wins: 30% Participant Runner, 67% Creator Treasury, 3% Protocol Platform Fee."
        ]
      }
    ]
  },

  "ctf-sandbox": {
    title: "CTF Security Gauntlet Sandbox Specification",
    badge: "Interactive Training",
    updated_at: "July 25, 2026",
    overview: "Interactive smart contract vulnerability benchmark suite covering Reentrancy, Access Control, AMM Oracle Flashloans, and Fee Precision Loss.",
    quickSummary: [
      { label: "Benchmark Suite", value: "4 Scenarios" },
      { label: "Target Language", value: "Solidity v0.8.20" },
      { label: "Grading Engine", value: "Real-Time AST Compiler" },
      { label: "Certificate", value: "Grade A+ Security Badge" },
    ],
    sections: [
      {
        heading: "1. Benchmark Scenarios Overview",
        subheading: "Deconstructing core smart contract vulnerability patterns",
        paragraphs: [
          "Reentrancy Gauntlet Vault: State modification order & external token callbacks.",
          "Access Control Role Escalation: Unprotected initializer functions & admin migrations.",
          "AMM Oracle Flashloan Manipulation: Spot price vs TWAP manipulation in liquidity pools.",
          "Fee Precision Loss & Rounding: Integer truncation exploits in yield distribution routines."
        ]
      }
    ]
  }
}

export default function DocDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const doc = DOCS[slug] || DOCS["playground-lifecycle"]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1050px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Top Navigation */}
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documentation Hub
          </Link>

          {/* Doc Header */}
          <div className="space-y-4 border-b border-border/60 pb-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs uppercase font-mono px-3 py-1">
                {doc.badge}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">Last Updated: {doc.updated_at}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.2]">
              {doc.title}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {doc.overview}
            </p>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {doc.quickSummary.map((item, idx) => (
              <Card key={idx} className="border border-border/60 bg-card/60 backdrop-blur-xl p-4 text-center space-y-1">
                <p className="text-[10px] uppercase font-mono font-bold text-muted-foreground">{item.label}</p>
                <p className="text-sm sm:text-lg font-bold text-primary font-mono">{item.value}</p>
              </Card>
            ))}
          </div>

          {/* Doc Content Sections */}
          <div className="space-y-12">
            {doc.sections.map((section, idx) => (
              <section key={idx} className="space-y-6">
                <div className="space-y-1 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-1.5 rounded-full bg-primary" />
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                      {section.heading}
                    </h2>
                  </div>
                  {section.subheading && (
                    <p className="text-xs sm:text-sm font-semibold text-primary font-mono pl-4">
                      {section.subheading}
                    </p>
                  )}
                </div>

                <div className="space-y-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {section.bulletPoints && (
                  <div className="my-6 rounded-3xl border border-border bg-card/60 p-6 sm:p-8 space-y-3 shadow-lg">
                    <p className="font-mono text-xs uppercase font-bold text-primary tracking-wider">Technical Highlights:</p>
                    <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                      {section.bulletPoints.map((item, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.codeBlock && (
                  <div className="my-6 rounded-3xl border border-border bg-slate-950 p-6 sm:p-8 font-mono text-xs sm:text-sm overflow-x-auto space-y-3 shadow-2xl">
                    {section.codeTitle && (
                      <p className="text-xs text-purple-400 font-bold border-b border-slate-800 pb-2">{section.codeTitle}</p>
                    )}
                    <pre className="text-emerald-400 leading-relaxed">
                      <code>{section.codeBlock}</code>
                    </pre>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Footer Callout */}
          <div className="rounded-3xl border border-border bg-card/60 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-foreground">Need Protocol Integration Assistance?</h3>
              <p className="text-xs text-muted-foreground">Contact our autonomous security research engineers or launch a sprint in the Playground Arena.</p>
            </div>
            <Button asChild className="rounded-full bg-primary hover:bg-primary/90 font-semibold gap-2 px-6 py-6 text-sm">
              <Link href="/playground">
                Launch Playground Arena
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

        </div>
      </main>

      <FooterSection />
    </div>
  )
}
