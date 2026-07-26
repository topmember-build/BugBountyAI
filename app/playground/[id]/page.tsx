"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Trophy, ShieldCheck, ArrowLeft, ExternalLink, Code, Play, CheckCircle2, Clock, Sparkles, Loader2, Zap, FileCode, FolderArchive, UploadCloud, Coins, Bot, UserCheck, Gavel, Scale, AlertTriangle, FileText, CheckSquare, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { calculateCompetitionEntryFee, recordDailyQuotaUsage, checkDailyFreeQuota } from "@/lib/playground-fees"
import { JudgingRoom } from "@/components/playground/judging-room"

export default function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { toast } = useToast()
  const { id } = use(params)
  const [competition, setCompetition] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [findings, setFindings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)

  // Registration & Agent Binding State
  const [regOption, setRegOption] = useState<"new_agent" | "existing_agent" | "default_swarm">("new_agent")
  const [newAgentName, setNewAgentName] = useState("Vanguard-Sec-AI")
  const [newAgentPrompt, setNewAgentPrompt] = useState("Analyze smart contract bytecode for reentrancy, oracle manipulation, state inconsistency, and unhandled return values...")
  const [newAgentSpeciality, setNewAgentSpeciality] = useState("Reentrancy & Logic Bugs")
  const [boundWallet, setBoundWallet] = useState("0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82")

  // Participant Compiled Report & Approval State
  const [approvalConfirmed, setApprovalConfirmed] = useState(false)
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [submissionReceipt, setSubmissionReceipt] = useState<any>(null)

  // Playground Fee & Quota state
  const [agentType, setAgentType] = useState<"standard" | "custom">("standard")
  const [isQuotaAvailable, setIsQuotaAvailable] = useState(true)
  const [feeDetails, setFeeDetails] = useState<any>(null)
  const [feeReceipt, setFeeReceipt] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch(`/api/playground/competitions/${id}`)
        const data = await res.json()
        if (data.success) {
          setCompetition(data.competition)
          setLeaderboard(data.leaderboard || [])
          setFindings(data.recent_findings || [])
        }
      } catch (err) {
        console.error("Failed to load competition details:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  useEffect(() => {
    const quota = checkDailyFreeQuota()
    setIsQuotaAvailable(quota)
    const calc = calculateCompetitionEntryFee({ agentType })
    setFeeDetails(calc)
  }, [agentType, submitDialogOpen])

  const handleLaunchSwarm = async () => {
    setSubmitting(true)
    try {
      const quotaAvailable = checkDailyFreeQuota()
      const res = await fetch(`/api/playground/competitions/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: competition?.repo_url,
          branch: competition?.branch,
          agent_type: agentType,
          is_quota_used: !quotaAvailable,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (quotaAvailable && agentType === "standard") {
          recordDailyQuotaUsage()
        }
        setFeeReceipt(data.fee_receipt)
        setSubmitSuccess(true)
        toast({
          title: "AI Swarm Dispatched!",
          description: "Your security agent has been bound and is auditing the target codebase.",
        })
        setTimeout(() => {
          setSubmitDialogOpen(false)
          setSubmitSuccess(false)
        }, 3000)
      } else {
        toast({
          title: "Swarm Launch Failed",
          description: data.error || "Failed to dispatch AI agent swarm.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Submission failed:", err)
      toast({
        title: "Submission Error",
        description: err.message || "Network error while dispatching swarm.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveAndSubmitReport = async () => {
    if (!approvalConfirmed) return
    setSubmittingReport(true)
    try {
      const res = await fetch(`/api/playground/competitions/${id}/review-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_wallet: boundWallet,
          agent_id: regOption === "new_agent" ? "custom-" + newAgentName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "agent-sentinel",
          agent_name: regOption === "new_agent" ? newAgentName : "Sentinel-V4 Security Agent",
          compiled_findings: findings,
          approval_confirmed: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReportSubmitted(true)
        setSubmissionReceipt(data.receipt)
        toast({
          title: "Report Approved & Dispatched!",
          description: "Your compiled analysis report has been sent to the AI Tribunal for judging.",
        })
      } else {
        toast({
          title: "Report Submission Failed",
          description: data.error || "Failed to approve compiled report.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Failed to submit report:", err)
      toast({
        title: "Report Error",
        description: err.message || "Network error while submitting report.",
        variant: "destructive",
      })
    } finally {
      setSubmittingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center pt-28">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center pt-28 space-y-4">
          <h2 className="text-xl font-bold">Competition Not Found</h2>
          <Button asChild variant="outline">
            <Link href="/playground">Back to Playground</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Playground Arena
            </Link>

            <Badge variant="outline" className={`text-xs font-mono flex items-center gap-1 ${
              (() => {
                if (!competition) return "border-border text-muted-foreground"
                const now = Date.now()
                const regEnd = new Date(competition.registration_end_date || competition.start_date || now).getTime()
                const sprintEnd = new Date(competition.end_date || (now + 7 * 86400000)).getTime()
                
                if (now < regEnd) return "border-blue-500/30 text-blue-400"
                const diff = sprintEnd - now
                if (diff <= 0) return "border-rose-500/30 text-rose-400"
                if (diff < 86400000) return "border-red-500/30 text-red-400"
                return "border-amber-500/30 text-amber-400"
              })()
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {(() => {
                if (!competition) return "Loading..."
                const now = Date.now()
                const regEnd = new Date(competition.registration_end_date || competition.start_date || now).getTime()
                const sprintEnd = new Date(competition.end_date || (now + 7 * 86400000)).getTime()

                if (now < regEnd) {
                  const regDiff = regEnd - now
                  const days = Math.floor(regDiff / 86400000)
                  const hours = Math.floor((regDiff % 86400000) / 3600000)
                  return `Pre-Registration Open: ${days > 0 ? `${days}d ${hours}h` : `${hours}h`} Closes`
                }

                const diff = sprintEnd - now
                if (diff <= 0) return "Sprint Ended"
                const days = Math.floor(diff / 86400000)
                const hours = Math.floor((diff % 86400000) / 3600000)
                if (days > 0) return `Sprint Deadline: ${days}d ${hours}h Remaining`
                const mins = Math.floor((diff % 3600000) / 60000)
                return `Sprint Deadline: ${hours}h ${mins}m Remaining`
              })()}
            </Badge>
          </div>

          {/* Sprint Lifecycle Pipeline Bar */}
          {(() => {
            const now = Date.now()
            const startDate = new Date(competition?.start_date || now).getTime()
            const endDate = new Date(competition?.end_date || (now + 7 * 86400000)).getTime()
            const judgingEndDate = new Date(competition?.judging_end_date || (endDate + 3 * 86400000)).getTime()
            const payoutReleaseDate = new Date(competition?.payout_release_date || (judgingEndDate + 3 * 86400000)).getTime()

            let currentPhase = 1
            if (competition?.status === "pending_approval") currentPhase = 0
            else if (now < startDate) currentPhase = 1
            else if (now >= startDate && now < endDate) currentPhase = 2
            else if (now >= endDate && now < judgingEndDate) currentPhase = 3
            else if (now >= judgingEndDate && now < payoutReleaseDate) currentPhase = 4
            else currentPhase = 5

            const phaseStyle = (phase: number) => {
              if (phase < currentPhase) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold"
              if (phase === currentPhase) return "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20"
              return "border-border bg-background/40 text-muted-foreground"
            }
            const labelStyle = (phase: number) => {
              if (phase < currentPhase) return "text-emerald-500"
              if (phase === currentPhase) return "text-emerald-400 flex items-center gap-1"
              return ""
            }

            return (
              <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-muted-foreground">
                  <span className="text-foreground flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                    Sprint Lifecycle Pipeline
                  </span>
                  <span className="text-purple-300">
                    {currentPhase === 0 ? "Pending Admin Approval" : currentPhase >= 5 ? "Payout Complete" : `Phase ${currentPhase} of 5 Active`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1 text-[11px] font-mono">
                  <div className={`rounded-xl border p-2 space-y-0.5 ${phaseStyle(1)}`}>
                    <p className={`text-[10px] uppercase font-bold ${labelStyle(1)}`}>
                      {currentPhase === 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      1. Registration
                    </p>
                    <p className="truncate">{currentPhase > 1 ? "Agent & Wallet Bound ✓" : "Bind Agent & Wallet"}</p>
                  </div>

                  <div className={`rounded-xl border p-2 space-y-0.5 ${phaseStyle(2)}`}>
                    <p className={`text-[10px] uppercase font-bold ${labelStyle(2)}`}>
                      {currentPhase === 2 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      2. Active Sprint
                    </p>
                    <p className="truncate">{currentPhase > 2 ? "Sprint Complete ✓" : currentPhase === 2 ? "Bug Hunting Live" : "Awaiting Start"}</p>
                  </div>

                  <div className={`rounded-xl border p-2 space-y-0.5 ${phaseStyle(3)}`}>
                    <p className={`text-[10px] uppercase font-bold ${labelStyle(3)}`}>
                      {currentPhase === 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      3. Participant Review
                    </p>
                    <p className="truncate">{currentPhase > 3 ? "Reports Submitted ✓" : currentPhase === 3 ? "Approve Before Deadline" : "Pending"}</p>
                  </div>

                  <div className={`rounded-xl border p-2 space-y-0.5 ${phaseStyle(4)}`}>
                    <p className={`text-[10px] uppercase font-bold ${labelStyle(4)}`}>
                      {currentPhase === 4 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      4. AI Judging
                    </p>
                    <p className="truncate">{currentPhase > 4 ? "Verdicts Certified ✓" : currentPhase === 4 ? "Tribunal Deliberating" : "3-Day Tribunal Review"}</p>
                  </div>

                  <div className={`rounded-xl border p-2 space-y-0.5 ${phaseStyle(5)}`}>
                    <p className={`text-[10px] uppercase font-bold ${labelStyle(5)}`}>
                      {currentPhase === 5 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      5. Wallet Cooldown
                    </p>
                    <p className="truncate">{currentPhase >= 5 ? "Escrow Released ✓" : "3-Day Escrow Release"}</p>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-6 sm:p-10 backdrop-blur-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-500" />
                    {competition.status === "active" ? "Live Sprint" : competition.status}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-background/50 text-xs">
                    {competition.category}
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1 font-mono">
                    <Trophy className="h-3 w-3" />
                    Top {competition.max_winners || 5} Winners
                  </Badge>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs uppercase font-mono">
                    {competition.distribution_mode ? competition.distribution_mode.replace(/_/g, " ") : "Severity-Weighted"}
                  </Badge>
                  {competition.has_prior_audit ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs flex items-center gap-1 font-mono">
                      <ShieldCheck className="h-3 w-3 text-amber-400" />
                      Prior Audit Declared ({competition.prior_audit_source || "External"})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1 font-mono">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      No Prior Audits (Fresh Scope)
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">{competition.title}</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">{competition.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-left md:text-right">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Prize Pool</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono">${competition.prize_pool_usdc} USDC</p>
                  <p className="text-[10px] text-muted-foreground">Escrow Guaranteed &middot; 87% Winner / 3% Protocol / 10% Creator</p>
                </div>

                <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:w-auto gap-2 font-bold shadow-lg shadow-primary/20">
                      <Play className="h-4 w-4 fill-current" />
                      Join Sprint & Launch Swarm
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] bg-card/95 border-border backdrop-blur-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Launch AI Swarm Entry
                      </DialogTitle>
                      <DialogDescription>
                        Dispatch your active AI agents to scan <code className="text-foreground">{competition.repo_url}</code> and compete for a share of the ${competition.prize_pool_usdc} USDC pool.
                      </DialogDescription>
                    </DialogHeader>

                    {submitSuccess ? (
                      <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                        <h4 className="font-bold text-lg">Agent Registered & Swarm Dispatched</h4>
                        <p className="text-xs text-muted-foreground">Your agent is actively analyzing the contract code. Remember to review & approve the compiled findings report before the sprint deadline.</p>

                        {feeReceipt && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1 text-left font-mono">
                            <p className="font-bold text-emerald-400">Registration Receipt:</p>
                            <p className="text-muted-foreground">Registered Agent: <span className="text-foreground">{regOption === "new_agent" ? newAgentName : "Sentinel-V4 Swarm"}</span></p>
                            <p className="text-muted-foreground">Bound Wallet: <span className="text-foreground">{boundWallet.slice(0, 10)}...{boundWallet.slice(-6)}</span></p>
                            <p className="text-muted-foreground">Entry Fee Paid: <span className="text-emerald-400 font-bold">${feeReceipt.fee_usdc.toFixed(2)} USDC</span></p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {/* 3 Registration Options */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground">Select Agent Registration Mode:</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => { setRegOption("new_agent"); setAgentType("custom"); }}
                              className={`p-2.5 rounded-xl border text-left text-xs transition-all space-y-1 ${
                                regOption === "new_agent"
                                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                                  : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px]">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                New Agent
                              </div>
                              <p className="text-[10px] text-muted-foreground">Prompt & Speciality</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setRegOption("existing_agent"); setAgentType("custom"); }}
                              className={`p-2.5 rounded-xl border text-left text-xs transition-all space-y-1 ${
                                regOption === "existing_agent"
                                  ? "border-purple-500 bg-purple-500/10 text-foreground font-semibold"
                                  : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px] text-purple-400">
                                <UserCheck className="h-3.5 w-3.5 text-purple-400" />
                                Deployed Agent
                              </div>
                              <p className="text-[10px] text-muted-foreground">Platform Deployed</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setRegOption("default_swarm"); setAgentType("standard"); }}
                              className={`p-2.5 rounded-xl border text-left text-xs transition-all space-y-1 ${
                                regOption === "default_swarm"
                                  ? "border-blue-500 bg-blue-500/10 text-foreground font-semibold"
                                  : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold text-[11px] text-blue-400">
                                <Bot className="h-3.5 w-3.5 text-blue-400" />
                                Default Swarm
                              </div>
                              <p className="text-[10px] text-muted-foreground">Sentinel Specialist</p>
                            </button>
                          </div>
                        </div>

                        {/* Option 1: New Agent Controls */}
                        {regOption === "new_agent" && (
                          <div className="space-y-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Agent Name</Label>
                              <Input
                                placeholder="e.g. Vanguard-Sec-AI"
                                value={newAgentName}
                                onChange={(e) => setNewAgentName(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Speciality Focus</Label>
                              <Select value={newAgentSpeciality} onValueChange={setNewAgentSpeciality}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select Speciality" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Reentrancy & Logic Bugs">Reentrancy & State Logic</SelectItem>
                                  <SelectItem value="Price Oracles & Flashloans">Price Oracles & Flashloans</SelectItem>
                                  <SelectItem value="Access Control & Roles">Access Control & Role Escalation</SelectItem>
                                  <SelectItem value="Gas & Invariant Arithmetic">Gas & Invariant Arithmetic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Custom System Prompt</Label>
                              <Textarea
                                rows={2}
                                placeholder="Instruct your agent on specific attack vectors and invariants..."
                                value={newAgentPrompt}
                                onChange={(e) => setNewAgentPrompt(e.target.value)}
                                className="text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* Option 2: Existing Deployed Agent Selector */}
                        {regOption === "existing_agent" && (
                          <div className="space-y-1.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
                            <Label className="text-xs font-semibold">Select Previously Deployed Agent</Label>
                            <Select defaultValue="agent-sentinel-v4">
                              <SelectTrigger className="h-8 text-xs font-mono">
                                <SelectValue placeholder="Select Agent" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agent-sentinel-v4">Sentinel-V4 Security Agent (Rank #1)</SelectItem>
                                <SelectItem value="agent-logicaudit">LogicAudit AI Swarm (Rank #2)</SelectItem>
                                <SelectItem value="agent-vanguard">ContractVanguard Agent (Rank #3)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Earning Wallet Notice Box */}
                        {regOption !== "new_agent" ? (
                          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2 text-xs">
                            <Coins className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-emerald-200/90 leading-relaxed text-[11px]">
                              <strong className="text-emerald-400 font-semibold">🤝 Fair Shared Earning Structure:</strong> Competing with a pre-deployed platform/marketplace agent shares earnings fairly: <strong className="text-emerald-400">30% to You (Participant Runner)</strong>, <strong>67% to Agent Creator</strong>, and <strong>3% Protocol Fee</strong>.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-3 flex items-start gap-2 text-xs">
                            <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                            <p className="text-purple-200/90 leading-relaxed text-[11px]">
                              <strong className="text-purple-400 font-semibold">🚀 Custom Creator Advantage:</strong> Creating your own custom agent gives you the maximum payout: <strong className="text-emerald-400">87% to You (Participant Winner)</strong>, <strong>10% Creator Royalty</strong>, and <strong>3% Protocol Fee</strong>.
                            </p>
                          </div>
                        )}

                        {/* Bound Participant Wallet Input */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold flex items-center gap-1 text-foreground">
                            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                            Bound Participant Reward Wallet (EVM)
                          </Label>
                          <Input
                            placeholder="0x..."
                            value={boundWallet}
                            onChange={(e) => setBoundWallet(e.target.value)}
                            className="font-mono text-xs"
                            required
                          />
                          <p className="text-[10px] text-muted-foreground">Prize pool rewards will be escrowed to this verified wallet upon winning.</p>
                        </div>

                        {/* Payment & Earning Model Breakdown Box */}
                        <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-semibold border-b border-border/50 pb-1.5">
                            <span className="flex items-center gap-1.5 text-foreground">
                              <Scale className="h-4 w-4 text-purple-400" />
                              Payment & Earning Model Breakdown
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-300">
                              {regOption === "new_agent" ? "Active: Custom 87/10/3" : "Active: Shared 30/67/3"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className={`p-2.5 rounded-xl border transition-all ${regOption === "new_agent" ? "border-purple-500/60 bg-purple-500/10 shadow-sm" : "border-border/40 bg-background/30 opacity-60"}`}>
                              <p className="font-bold text-purple-300 text-[10px] uppercase tracking-wider">Option 1: Custom Agent</p>
                              <p className="text-emerald-400 font-bold font-mono text-sm">87% Participant</p>
                              <p className="text-muted-foreground text-[10px]">10% Creator Royalty &middot; 3% Relayer Fee</p>
                            </div>

                            <div className={`p-2.5 rounded-xl border transition-all ${regOption !== "new_agent" ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm" : "border-border/40 bg-background/30 opacity-60"}`}>
                              <p className="font-bold text-emerald-300 text-[10px] uppercase tracking-wider">Option 2/3: Platform Agent</p>
                              <p className="text-emerald-400 font-bold font-mono text-sm">30% Participant</p>
                              <p className="text-muted-foreground text-[10px]">67% Creator Royalty &middot; 3% Relayer Fee</p>
                            </div>
                          </div>

                          <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                            <strong className="text-foreground font-semibold">What is Agent Creator Royalty?</strong> Passive income automatically transferred to the developer who created and registered the AI agent on-chain when their agent wins.
                          </p>
                        </div>

                        {feeDetails && (
                          <div className="rounded-xl border border-border bg-background/60 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="flex items-center gap-1.5 text-foreground">
                                <Coins className="h-4 w-4 text-emerald-400" />
                                Selected Sprint Entry Fee:
                              </span>
                              <span className={`font-mono text-sm ${feeDetails.fee_usdc === 0 ? "text-emerald-400 font-bold" : "text-foreground"}`}>
                                {feeDetails.fee_usdc === 0 ? "FREE (Daily Quota)" : `$${feeDetails.fee_usdc.toFixed(2)} USDC`}
                              </span>
                            </div>

                            <div className="text-[11px] space-y-1 pt-1 border-t border-border/50 text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Status / Quota:</span>
                                <span className="text-foreground">{feeDetails.breakdown.quota_reason}</span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground">Your Net Winner Payout:</span>
                                <span className="text-emerald-400 font-mono font-bold">
                                  {regOption === "new_agent" ? "87% of Prize Pool" : "30% of Prize Pool"}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground">Agent Creator Royalty:</span>
                                <span className="text-purple-400 font-mono">
                                  {regOption === "new_agent" ? "10% Royalty" : "67% Royalty (Pre-built Expert)"}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground">Protocol Escrow Fee (Relayer):</span>
                                <span className="text-foreground font-mono">3% Protocol Fee</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-xl border border-border/60 bg-background/30 p-2.5 text-[11px] text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">Target Repository:</p>
                          <p className="font-mono break-all">{competition.repo_url}</p>
                          <p>Branch: <span className="text-foreground font-mono">{competition.branch}</span></p>
                        </div>

                        <Button onClick={handleLaunchSwarm} disabled={submitting} className="w-full gap-2 font-semibold">
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                          {feeDetails?.fee_usdc === 0 ? "Confirm & Launch Free Swarm" : `Pay $${feeDetails?.fee_usdc.toFixed(2)} USDC & Launch`}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="pt-6 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Code Scope:</span>
                {competition.code_source_type === "paste" || competition.repo_url?.startsWith("internal://pasted-code") ? (
                  <Badge variant="outline" className="font-mono border-emerald-500/30 text-emerald-400 gap-1">
                    <FileCode className="h-3.5 w-3.5" />
                    Pasted Contract: {competition.contract_filename || "Contract.sol"}
                  </Badge>
                ) : competition.code_source_type === "zip" || competition.repo_url?.startsWith("internal://zip-archive") ? (
                  <Badge variant="outline" className="font-mono border-purple-500/30 text-purple-300 gap-1">
                    <FolderArchive className="h-3.5 w-3.5" />
                    ZIP Archive: {competition.uploaded_file_name || "audit-source.zip"}
                  </Badge>
                ) : competition.code_source_type === "files" || competition.repo_url?.startsWith("internal://contract-files") ? (
                  <Badge variant="outline" className="font-mono border-blue-500/30 text-blue-300 gap-1">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Files: {competition.uploaded_file_name || "SourceCode.sol"}
                  </Badge>
                ) : (
                  <a
                    href={competition.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    {competition.repo_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {competition.escrow_contract_address && (
                <a
                  href={`https://testnet.arcscan.app/address/${(competition.escrow_contract_address || "0x3b2b4345a5327e27261a51ee0de57be29dffbbdd").replace(/['"]/g, "").trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400 hover:underline bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify Escrow on ArcScan:</span>
                  <span>{competition.escrow_contract_address.substring(0, 8)}...</span>
                </a>
              )}
            </div>
          </div>

          {/* Raw Pasted Smart Contract Viewer */}
          {competition.raw_code_content && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-foreground text-sm">Pasted Smart Contract Source ({competition.contract_filename || "Contract.sol"})</h3>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400">
                  Target Audit Contract
                </Badge>
              </div>
              <pre className="p-4 rounded-xl border border-border bg-background/80 font-mono text-xs overflow-x-auto text-foreground leading-relaxed max-h-96">
                <code>{competition.raw_code_content}</code>
              </pre>
            </Card>
          )}

          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="bg-card/80 border border-border p-1 rounded-2xl">
              <TabsTrigger value="leaderboard" className="gap-2 text-xs font-bold rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Trophy className="h-4 w-4" />
                Live Arena Leaderboard
              </TabsTrigger>
              <TabsTrigger value="judging" className="gap-2 text-xs font-bold rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Gavel className="h-4 w-4" />
                🏛️ AI Judging Room (Tribunal)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-6">
              {/* Participant Compiled Report Review & Approval Card */}
              <Card className="border-amber-500/40 bg-card/80 backdrop-blur-2xl p-5 space-y-4 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-amber-400" />
                      <h3 className="font-bold text-foreground text-base">Participant Report Compilation & Deadline Submission</h3>
                      <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-400">
                        Phase 3: Required Approval
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Agents hunt bugs during the active sprint. You must review the compiled analysis report and click <strong>Approve & Submit Report</strong> before the competition deadline to avoid disqualification.
                    </p>
                  </div>

                  {reportSubmitted && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs font-mono py-1 px-3">
                      ✓ REPORT SUBMITTED ON TIME
                    </Badge>
                  )}
                </div>

                {reportSubmitted && submissionReceipt ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1.5 font-mono text-xs">
                    <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Official Compiled Report Approved & Dispatched to AI Tribunal!
                    </p>
                    <p className="text-muted-foreground">Receipt ID: <span className="text-foreground">{submissionReceipt.submission_id}</span></p>
                    <p className="text-muted-foreground">Bound Reward Wallet: <span className="text-foreground">{submissionReceipt.participant_wallet}</span></p>
                    <p className="text-muted-foreground">Disqualification Risk: <span className="text-emerald-400 font-bold">CLEAR (Approved Before Deadline)</span></p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono">Agent Discoveries (Compiled):</span>
                        <p className="font-bold text-foreground font-mono">{findings.length} Vulnerability Findings Compiled</p>
                        <p className="text-[11px] text-muted-foreground">Discovered by registered agent swarm during active sprint.</p>
                      </div>

                      <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1">
                        <span className="text-muted-foreground text-[10px] uppercase font-mono">Bound Winner Reward Wallet:</span>
                        <p className="font-bold text-emerald-400 font-mono break-all">{boundWallet}</p>
                        <p className="text-[11px] text-muted-foreground">Escrow payouts will transfer to this wallet upon verification.</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-200/90 leading-relaxed">
                        <strong className="text-amber-400 font-semibold">Disqualification Warning:</strong> Agents continue analysis until the deadline. Unapproved reports at deadline expiration will be automatically disqualified from the AI Tribunal judging round.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={approvalConfirmed}
                          onChange={(e) => setApprovalConfirmed(e.target.checked)}
                          className="h-4 w-4 rounded border-border accent-emerald-500"
                        />
                        <span>I have reviewed and approve the compiled findings report for AI Tribunal Judging.</span>
                      </label>

                      <Button
                        onClick={handleApproveAndSubmitReport}
                        disabled={!approvalConfirmed || submittingReport}
                        className="w-full sm:w-auto font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 shrink-0 gap-2"
                      >
                        {submittingReport ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <CheckSquare className="h-4 w-4" />}
                        Approve & Submit Compiled Report
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        Isolated Competition Sprint Leaderboard
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Standalone leaderboard exclusive to this competition sprint. Isolated from global platform agent rankings.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-300">
                      Isolated Sprint Board
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono border-border">
                      {leaderboard.length} Swarms
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Agent / Swarm</TableHead>
                      <TableHead className="text-center">Severity (C/H/M)</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Est. USDC Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow key={entry.rank} className="border-border/40">
                        <TableCell className="font-extrabold text-foreground">
                          {entry.rank === 1 ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs">1</span>
                          ) : entry.rank === 2 ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300/20 text-slate-300 text-xs">2</span>
                          ) : entry.rank === 3 ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/20 text-amber-600 text-xs">3</span>
                          ) : (
                            `#${entry.rank}`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground">{entry.agent_name}</p>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold rounded-full px-2 py-0 ${
                                  entry.rank === 1
                                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                                    : entry.rank === 2
                                      ? "border-slate-400/40 bg-slate-400/15 text-slate-300"
                                      : entry.rank === 3
                                        ? "border-amber-700/40 bg-amber-700/15 text-amber-500"
                                        : "border-border text-muted-foreground"
                                }`}
                              >
                                {entry.rank === 1 ? "Sprint Champion" : entry.rank === 2 ? "Top Auditor" : entry.rank === 3 ? "Zero-Day Hunter" : "Verified"}
                              </Badge>
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground">{entry.owner}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <span className="text-red-400">{entry.critical_count}</span>/
                            <span className="text-amber-400">{entry.high_count}</span>/
                            <span className="text-blue-400">{entry.medium_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {entry.score.toLocaleString()} pts
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-emerald-400">
                          ${entry.estimated_reward_usdc.toLocaleString()} USDC
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Live Findings Stream
                </CardTitle>
                <CardDescription>Verified discoveries during this sprint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {findings.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-xl border border-border/50 bg-background/40 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          f.severity === "critical"
                            ? "border-red-500/40 text-red-400 bg-red-500/10"
                            : f.severity === "high"
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                              : "border-blue-500/40 text-blue-400 bg-blue-500/10"
                        }`}
                      >
                        {f.severity} ({f.confidence}%)
                      </Badge>
                      <span className="text-[11px] font-bold text-emerald-400">+${f.reward_usdc} USDC</span>
                    </div>

                    <p className="text-xs font-semibold text-foreground line-clamp-2">{f.title}</p>

                    <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                      <span>{f.agent_name}</span>
                      <span className="font-mono text-[10px]">Just now</span>
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="judging">
          <JudgingRoom competitionId={id} />
        </TabsContent>
      </Tabs>
        </div>
      </main>

      <FooterSection />
    </div>
  )
}
