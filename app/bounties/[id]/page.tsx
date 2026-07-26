"use client"

import { useState, use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, ShieldCheck, ArrowLeft, ExternalLink, Code, Play, CheckCircle2, Clock, Sparkles, Loader2, Zap, FileCode, Send, AlertTriangle, FileText, Wallet, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function BugBountyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()

  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submittingPoC, setSubmittingPoC] = useState(false)
  const [submissionReceipt, setSubmissionReceipt] = useState<any>(null)

  const [pocForm, setPocForm] = useState({
    finding_title: "",
    severity: "critical",
    target_contract: "YieldVault.sol",
    poc_code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExploitPoC {
    // 1. Reentrancy call to withdraw() before balance zeroed
}`,
    hacker_wallet: "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
    description: "",
  })

  const handleSubmitPoC = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPoC(true)

    try {
      // Simulate API submit
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const receipt = {
        poc_id: "poc-" + Date.now().toString(36),
        bounty_id: id,
        severity: pocForm.severity,
        hacker_wallet: pocForm.hacker_wallet,
        submitted_at: new Date().toISOString(),
        escrow_status: "LOCKED_IN_ESCROW",
      }

      setSubmissionReceipt(receipt)
      toast({
        title: "PoC Vulnerability Report Submitted!",
        description: "Your report has been encrypted and sent to the AI Tribunal for verification.",
      })
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit PoC report.",
        variant: "destructive",
      })
    } finally {
      setSubmittingPoC(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/bounties"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Bug Bounty Directory
          </Link>

          {/* Banner Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-10 backdrop-blur-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-400" />
                    Live Program
                  </Badge>
                  <Badge variant="outline" className="border-border bg-background/50 text-xs">
                    Smart Contracts & DeFi
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1 font-mono">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Escrow Verified on Arc Testnet
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  Arc Liquidity & AMM Swap Protocol
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Audit and submit vulnerability PoCs for ArcDEX core liquidity pools, flash loan vault contracts, and governance fee routing modules.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-left md:text-right">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Max Critical Reward</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono">$100,000 USDC</p>
                  <p className="text-[10px] text-muted-foreground">100% Escrow Secured on Arc Testnet</p>
                </div>

                {/* PoC Submit Dialog */}
                <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:w-auto gap-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20">
                      <Send className="h-4 w-4" />
                      Submit PoC Exploit Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px] bg-card/95 border-border backdrop-blur-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileCode className="h-5 w-5 text-emerald-400" />
                        Submit Vulnerability Proof-of-Concept
                      </DialogTitle>
                      <DialogDescription>
                        Submit your verified PoC exploit for <strong>Arc Liquidity & AMM Swap Protocol</strong>. Rewards will be released from Arc Escrow contract.
                      </DialogDescription>
                    </DialogHeader>

                    {!submissionReceipt ? (
                      <form onSubmit={handleSubmitPoC} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="title">Vulnerability Title</Label>
                          <Input
                            id="title"
                            placeholder="e.g. Reentrancy Flaw in withdrawLiquidity()"
                            value={pocForm.finding_title}
                            onChange={(e) => setPocForm({ ...pocForm, finding_title: e.target.value })}
                            required
                            className="text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="sev">Estimated Severity</Label>
                            <Select value={pocForm.severity} onValueChange={(val) => setPocForm({ ...pocForm, severity: val })}>
                              <SelectTrigger id="sev">
                                <SelectValue placeholder="Select Severity" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critical">Critical ($100,000 USDC)</SelectItem>
                                <SelectItem value="high">High ($25,000 USDC)</SelectItem>
                                <SelectItem value="medium">Medium ($5,000 USDC)</SelectItem>
                                <SelectItem value="low">Low ($1,000 USDC)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="wallet">Reward Winner Wallet Address</Label>
                            <Input
                              id="wallet"
                              placeholder="0x..."
                              value={pocForm.hacker_wallet}
                              onChange={(e) => setPocForm({ ...pocForm, hacker_wallet: e.target.value })}
                              required
                              className="font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="poc">Proof-of-Concept Exploit Code (Solidity / JS)</Label>
                          <Textarea
                            id="poc"
                            rows={4}
                            value={pocForm.poc_code}
                            onChange={(e) => setPocForm({ ...pocForm, poc_code: e.target.value })}
                            required
                            className="font-mono text-xs"
                          />
                        </div>

                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1">
                          <div className="flex items-center gap-1 font-semibold text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>100% Escrow Guaranteed Payout</span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Upon AI Tribunal verification, rewards transfer automatically to your wallet address from <code className="text-foreground font-mono">BugBountyEscrow.sol</code>.
                          </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <Button type="button" variant="outline" onClick={() => setSubmitModalOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={submittingPoC} className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                            {submittingPoC ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit Encrypted PoC Report
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="py-8 text-center space-y-4">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                        <h4 className="font-bold text-lg text-foreground">Vulnerability Report Submitted!</h4>
                        <p className="text-xs text-muted-foreground">Your PoC report has been logged and sent to the AI Tribunal for autonomous verification.</p>
                        
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-mono text-left space-y-1.5">
                          <p className="font-bold text-emerald-400">Receipt Details:</p>
                          <p className="text-muted-foreground">PoC Receipt ID: <span className="text-foreground">{submissionReceipt.poc_id}</span></p>
                          <p className="text-muted-foreground">Claim Wallet: <span className="text-foreground">{submissionReceipt.hacker_wallet}</span></p>
                          <p className="text-muted-foreground">Escrow Guarantee: <span className="text-emerald-400 font-bold">LOCKED & RESERVED</span></p>
                        </div>

                        <Button onClick={() => { setSubmitModalOpen(false); setSubmissionReceipt(null); }} className="w-full font-bold">
                          Close & Return to Program
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Severity Reward Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Vulnerability Reward Tiers
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="border-red-500/40 bg-red-500/5">
                <CardHeader className="pb-2">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 uppercase text-[10px] w-fit">Critical Severity</Badge>
                  <CardTitle className="text-2xl font-black font-mono text-red-400">$100,000 USDC</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Direct loss of protocol funds, reentrancy vault drain, or unauthorized governance minting.
                </CardContent>
              </Card>

              <Card className="border-amber-500/40 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 uppercase text-[10px] w-fit">High Severity</Badge>
                  <CardTitle className="text-2xl font-black font-mono text-amber-400">$25,000 USDC</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Temporary lockup of user funds, oracle price manipulation, or unauthorized role escalation.
                </CardContent>
              </Card>

              <Card className="border-blue-500/40 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 uppercase text-[10px] w-fit">Medium Severity</Badge>
                  <CardTitle className="text-2xl font-black font-mono text-blue-400">$5,000 USDC</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  State inconsistency, unhandled return values, or denial of service on reward callbacks.
                </CardContent>
              </Card>

              <Card className="border-border bg-card/40">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="uppercase text-[10px] w-fit">Low Severity</Badge>
                  <CardTitle className="text-2xl font-black font-mono text-foreground">$1,000 USDC</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Informational gas optimization, missing zero-address checks, or event logging omissions.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  )
}
