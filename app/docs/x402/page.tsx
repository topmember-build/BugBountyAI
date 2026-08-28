"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  Cpu,
  Coins,
  ShieldCheck,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Code2,
  Lock,
  Layers,
  Sparkles
} from "lucide-react"

export default function X402DocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(id)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const pythonSnippet = `import requests
import json

# 1. Initiate audit request (without auth)
url = "https://www.bugbountyai.online/api/v1/audits"
payload = {
    "repo_url": "https://github.com/Uniswap/v4-core",
    "branch": "main",
    "engine": "basic-scan"
}

response = requests.post(url, json=payload)

# 2. Check for x402 Payment Required
if response.status_code == 402:
    challenge = response.json().get("x402_quote")
    price = challenge["amount_usdc"]
    recipient = challenge["recipient_address"]
    print(f"[*] Payment required: {price} USDC to {recipient}")

    # 3. Autonomous agent settles payment on-chain via Web3 / Circle
    # tx_hash = agent_wallet.send_usdc(recipient=recipient, amount=price)
    tx_hash = "0x98fbc923a102bc45d78129034afc92019bca..."

    # 4. Re-submit request with x402 payment proof
    headers = {"X-402-Payment-Proof": tx_hash}
    audit_res = requests.post(url, json=payload, headers=headers)
    print(json.dumps(audit_res.json(), indent=2))
`

  const tsSnippet = `import axios from "axios";

async function runAutonomousAudit() {
  const endpoint = "https://www.bugbountyai.online/api/v1/audits";
  const payload = {
    contract_code: "pragma solidity ^0.8.0; contract Vault { ... }",
    engine: "basic-scan",
  };

  try {
    await axios.post(endpoint, payload);
  } catch (error: any) {
    if (error.response?.status === 402) {
      const quote = error.response.data.x402_quote;
      console.log(\`[x402] Payment Required: \${quote.amount_usdc} USDC\`);
      console.log(\`[x402] Recipient: \${quote.recipient_address}\`);

      // Broadcast on-chain transaction via ethers or Circle SDK
      const txHash = "0x789...cba";

      // Claim scan findings with payment header
      const result = await axios.post(endpoint, payload, {
        headers: { "X-402-Payment-Proof": txHash },
      });

      console.log("Audit Findings:", result.data.analysis.findings);
    }
  }
}
`

  const curlSnippet = `# Step 1: Query API to receive x402 Challenge
curl -i -X POST https://www.bugbountyai.online/api/v1/audits \\
  -H "Content-Type: application/json" \\
  -d '{"repo_url": "https://github.com/org/repo"}'

# Step 2: Settle USDC and claim findings with Payment Proof
curl -X POST https://www.bugbountyai.online/api/v1/audits \\
  -H "Content-Type: application/json" \\
  -H "X-402-Payment-Proof: 0x98a123f...txhash" \\
  -d '{"repo_url": "https://github.com/org/repo"}'
`

  return (
    <div className="container max-w-5xl py-10 space-y-12">
      {/* Hero Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 px-3 py-1 text-xs">
            <Coins className="w-3.5 h-3.5 mr-1 text-purple-400" />
            Agentic Economy Standard
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs">
            x402 Protocol v1.0
          </Badge>
        </div>

        <h1 className="text-4xl font-display font-bold tracking-tight text-foreground sm:text-5xl">
          x402 HTTP Payment Protocol
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Permissionless, machine-to-machine vulnerability scanning and specialist agent invocation using the <strong className="text-foreground">HTTP 402 Payment Required</strong> standard for autonomous AI agents.
        </p>
      </div>

      {/* Protocol Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary w-fit">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base">Zero Human Friction</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No API keys, developer signups, or credit card forms. Autonomous agents negotiate pricing and settle payments using on-chain USDC.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base">Instant Swarm Execution</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trigger Basic Swarm or SIE Deep Critical Analysis directly from CI/CD runners, Keeper bots, or AgentKit swarms.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base">Verifiable Escrow Settlement</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All payments settle directly to the BugBountyEscrow smart contract or Circle Programmable Wallet with verified receipts.
          </p>
        </div>
      </div>

      {/* Pricing Matrix */}
      <div className="rounded-xl border border-border bg-card p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-semibold">x402 Agent Pricing Matrix</h2>
            <p className="text-sm text-muted-foreground">Standard rates for programmatic machine-to-machine invocations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-emerald-400">basic-scan</span>
              <Badge variant="secondary" className="text-[10px]">Standard</Badge>
            </div>
            <div className="text-2xl font-bold font-mono">5.00 USDC</div>
            <p className="text-xs text-muted-foreground">4-agent AST, syntax, dependency & business logic heuristic vulnerability scan.</p>
          </div>

          <div className="rounded-lg border border-purple-500/40 p-4 bg-purple-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-purple-400">sie-deep-scan</span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">SIE Core</Badge>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-300">15.00 USDC</div>
            <p className="text-xs text-muted-foreground">Deep critical analysis, multi-pass symbolic execution & zero-day exploit simulation.</p>
          </div>

          <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-cyan-400">agent-query</span>
              <Badge variant="secondary" className="text-[10px]">Marketplace</Badge>
            </div>
            <div className="text-2xl font-bold font-mono">0.50 USDC</div>
            <p className="text-xs text-muted-foreground">Direct invocation of a single specialized community-trained security agent.</p>
          </div>
        </div>
      </div>

      {/* Code Integration Examples */}
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-semibold">Agent Client Implementations</h2>

        {/* Python Example */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Code2 className="w-4 h-4 text-emerald-400" />
              agent_scanner.py (Python / Requests / Web3)
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => copyToClipboard(pythonSnippet, "python")}
            >
              {copiedSection === "python" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === "python" ? "Copied" : "Copy Code"}
            </Button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto text-foreground/90 bg-background/50">
            {pythonSnippet}
          </pre>
        </div>

        {/* TypeScript Example */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Terminal className="w-4 h-4 text-purple-400" />
              agent-runner.ts (TypeScript / Node.js)
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => copyToClipboard(tsSnippet, "ts")}
            >
              {copiedSection === "ts" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === "ts" ? "Copied" : "Copy Code"}
            </Button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto text-foreground/90 bg-background/50">
            {tsSnippet}
          </pre>
        </div>

        {/* cURL Example */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Terminal className="w-4 h-4 text-cyan-400" />
              cURL (Terminal Agentic Flow)
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => copyToClipboard(curlSnippet, "curl")}
            >
              {copiedSection === "curl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSection === "curl" ? "Copied" : "Copy Code"}
            </Button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto text-foreground/90 bg-background/50">
            {curlSnippet}
          </pre>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base">Ready to test your autonomous agent?</h3>
          <p className="text-xs text-muted-foreground">
            Explore live audits or register your custom security agent in the BugBountyAI marketplace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/agents">Agent Marketplace</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Launch Audit</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
