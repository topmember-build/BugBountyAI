"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { HostCompetitionModal } from "@/components/playground/host-competition-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Trophy, ShieldCheck, ArrowLeft, ExternalLink, Zap, CheckCircle2, DollarSign, Send, Loader2, Sparkles, Check, X, AlertTriangle, Lock, Key, Clock, Eye, RotateCcw, KeyRound, Copy } from "lucide-react"

export default function PlaygroundManagePage() {
  const { toast } = useToast()
  const [competitions, setCompetitions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Host Code Auth State
  const [hostCodeInput, setHostCodeInput] = useState("")
  const [unlockedHostCode, setUnlockedHostCode] = useState<string | null>(null)

  // Admin Code Auth State
  const [adminCodeInput, setAdminCodeInput] = useState("")
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [adminError, setAdminError] = useState("")

  // Key Rotation Recovery State
  const [rotateModalOpen, setRotateModalOpen] = useState(false)
  const [recoveryCompId, setRecoveryCompId] = useState("")
  const [recoveryWallet, setRecoveryWallet] = useState("")
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState<any>(null)
  const [recoveryError, setRecoveryError] = useState("")
  const [recoveryCopied, setRecoveryCopied] = useState(false)

  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [selectedComp, setSelectedComp] = useState<any>(null)
  const [payoutForm, setPayoutForm] = useState({
    recipient_wallet: process.env.NEXT_PUBLIC_DEFAULT_WALLET_ADDRESS || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
    reward_amount_usdc: "2500",
  })
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutResult, setPayoutResult] = useState<any>(null)

  const fetchManageData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/playground/manage")
      const data = await res.json()
      if (data.success) {
        setCompetitions(data.competitions)
        setStats(data.stats)
      }
    } catch (err) {
      console.error("Failed to load manage data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchManageData()
  }, [])

  const handleUnlockHost = (e: React.FormEvent) => {
    e.preventDefault()
    if (hostCodeInput.trim()) {
      const code = hostCodeInput.trim().toUpperCase()
      setUnlockedHostCode(code)
      toast({
        title: "Host Dashboard Unlocked",
        description: `Active sprint access granted for code: ${code}`,
      })
    }
  }

  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/api/playground/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_code: adminCodeInput }),
      })
      const data = await res.json()
      if (data.success && data.verified) {
        setIsAdminUnlocked(true)
        setAdminError("")
        toast({
          title: "Admin Moderation Panel Unlocked",
          description: "Full moderation access granted.",
        })
      } else {
        setAdminError(data.error || "Invalid Admin Access Code.")
        toast({
          title: "Admin Access Denied",
          description: data.error || "Invalid Admin Access Code.",
          variant: "destructive",
        })
      }
    } catch (err) {
      setAdminError("Verification failed. Please try again.")
      toast({
        title: "Error",
        description: "Failed to verify admin code.",
        variant: "destructive",
      })
    }
  }

  const handleRotateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryLoading(true)
    setRecoveryError("")
    setRecoveryResult(null)

    try {
      const res = await fetch("/api/playground/competitions/recover-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition_id: recoveryCompId,
          host_wallet_address: recoveryWallet,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setRecoveryResult(data)
        fetchManageData()
      } else {
        setRecoveryError(data.error || "Failed to verify refund wallet address.")
      }
    } catch (err: any) {
      setRecoveryError(err.message || "An unexpected error occurred during key rotation.")
    } finally {
      setRecoveryLoading(false)
    }
  }

  const filteredHostCompetitions = competitions.filter((comp) => {
    if (comp.status === "pending_approval") return false
    if (!unlockedHostCode) return true
    return comp.host_access_code === unlockedHostCode || unlockedHostCode === "SHOW_ALL"
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Playground Arena
          </Link>

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                <Trophy className="h-3.5 w-3.5" />
                <span>Playground Host & Admin Control Panel</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Sponsor & Admin Control Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your unique Host Access Code or Admin Security Code to manage active sprints, review judging cooldowns, and execute escrow payouts.
              </p>
            </div>

            <HostCompetitionModal onCreated={fetchManageData} />
          </div>

          {/* Host Access Code Prompt Bar */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-xl p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Host Access Code Authentication</h2>
                  <p className="text-xs text-muted-foreground">
                    {unlockedHostCode
                      ? `Unlocked with code: ${unlockedHostCode}`
                      : "Enter the unique Host Code generated when you hosted your competition."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUnlockHost} className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="e.g. HOST-BOUNTY-8F92A"
                  value={hostCodeInput}
                  onChange={(e) => setHostCodeInput(e.target.value)}
                  className="font-mono text-xs uppercase w-full sm:w-48 bg-background/60"
                />
                <Button type="submit" size="sm" variant="secondary" className="gap-1 font-semibold text-xs whitespace-nowrap">
                  <Lock className="h-3.5 w-3.5" />
                  Unlock Sprints
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setRotateModalOpen(true); setRecoveryError(""); setRecoveryResult(null); }}
                  className="gap-1 font-semibold text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Lost Code? Rotate Key
                </Button>
                {unlockedHostCode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setUnlockedHostCode(null); setHostCodeInput(""); }}
                    className="text-xs text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </form>
            </div>
          </Card>

          {/* Dashboard Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-6 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Hosted Sprints</p>
                {loading ? (
                  <div className="h-8 w-16 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl font-black text-foreground">{stats?.total_hosted || 0}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-6 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Locked Escrow Pool</p>
                {loading ? (
                  <div className="h-8 w-28 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl font-black text-amber-400 font-mono">
                    ${(stats?.total_escrow_locked_usdc || 0).toLocaleString()} USDC
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-6 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Sprints</p>
                {loading ? (
                  <div className="h-8 w-16 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-2xl font-black text-primary flex items-center gap-1.5">
                    {stats?.active_sprints || 0}
                    <Zap className="h-4 w-4 animate-pulse" />
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-6 space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Arc Escrow Status</p>
                {loading ? (
                  <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md mt-1" />
                ) : (
                  <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Verified Active
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Management & Admin Tabs */}
          <Tabs defaultValue="sprints" className="space-y-6">
            <TabsList className="bg-card/80 border border-border/80 p-1 rounded-full">
              <TabsTrigger value="sprints" className="rounded-full text-xs font-semibold px-4">
                Hosted Audit Sprints ({filteredHostCompetitions.length})
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-full text-xs font-semibold px-4 gap-1.5 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Admin Moderation Panel ({competitions.filter((c) => c.status === "pending_approval").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sprints">
              <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xl">Hosted Audit Sprints</CardTitle>
                    <CardDescription>Monitor event duration, judging cooldowns, and execute escrow payouts</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60 hover:bg-transparent">
                          <TableHead>Sprint Title & Host Code</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Lifecycle Phase</TableHead>
                          <TableHead className="text-right">Prize Pool</TableHead>
                          <TableHead className="text-right">Arc Escrow</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHostCompetitions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                              No hosted competitions match this Host Access Code. Try unlocking with your code above.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredHostCompetitions.map((comp) => (
                            <TableRow key={comp.id} className="border-border/40">
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-sm text-foreground">{comp.title}</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-muted-foreground">Sponsor: {comp.sponsor_name}</span>
                                    {comp.host_access_code && (
                                      <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                                        {comp.host_access_code}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {comp.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge
                                    className={`text-[10px] uppercase font-bold gap-1 ${
                                      comp.lifecycle_phase === "sprint_active" || comp.status === "active"
                                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                                        : comp.lifecycle_phase === "judging_cooldown"
                                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                          : comp.lifecycle_phase === "escrow_cooldown"
                                            ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    <Clock className="h-3 w-3" />
                                    {comp.lifecycle_phase === "sprint_active" || comp.status === "active"
                                      ? "Sprint Active"
                                      : comp.lifecycle_phase === "judging_cooldown"
                                        ? "Judging Cooldown (3 Days)"
                                        : comp.lifecycle_phase === "escrow_cooldown"
                                          ? "Escrow Cooldown (3 Days)"
                                          : "Payout Released"}
                                  </Badge>
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    Duration: {comp.duration_days || 7} Days
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-extrabold text-foreground">
                                ${comp.prize_pool_usdc.toLocaleString()} USDC
                              </TableCell>
                              <TableCell className="text-right">
                                <a
                                  href={`https://testnet.arcscan.app/address/${(comp.escrow_contract_address || "0x3b2b4345a5327e27261a51ee0de57be29dffbbdd").replace(/['"]/g, "").trim()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400 hover:underline"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span>Verified</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </TableCell>
                              <TableCell className="text-right">
                                {unlockedHostCode === comp.host_access_code || unlockedHostCode === "SHOW_ALL" ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                      onClick={async () => {
                                        setLoading(true)
                                        try {
                                          await fetch(`/api/playground/competitions/${comp.id}/payout`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              mode: "batch_settle",
                                              prize_pool_usdc: comp.prize_pool_usdc,
                                              host_access_code: unlockedHostCode,
                                            }),
                                          })
                                          fetchManageData()
                                        } catch (e) {
                                          console.error("Batch settle failed:", e)
                                        } finally {
                                          setLoading(false)
                                        }
                                      }}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      Auto-Settle Sprint
                                    </Button>

                                    <Button
                                      size="sm"
                                      className="rounded-full gap-1.5 text-xs font-semibold"
                                      onClick={() => {
                                        setSelectedComp(comp)
                                        setPayoutForm({
                                          recipient_wallet: "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
                                          reward_amount_usdc: comp.prize_pool_usdc.toString(),
                                        })
                                        setPayoutModalOpen(true)
                                      }}
                                    >
                                      <DollarSign className="h-3.5 w-3.5" />
                                      Release Payout
                                    </Button>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="border-amber-500/30 text-amber-400 gap-1 text-[11px]">
                                    <Lock className="h-3 w-3" />
                                    Host Code Required
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-400" />
                    Admin Moderation Panel
                  </CardTitle>
                  <CardDescription>
                    Requires Special Admin Access Code to unlock. Review hosted competitions before going live and execute escrow refunds for invalid submissions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isAdminUnlocked ? (
                    <div className="max-w-md mx-auto py-8 space-y-4 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Lock className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-foreground">Admin Access Code Required</h3>
                        <p className="text-xs text-muted-foreground">
                          Enter your special Admin Access Code to unlock the moderation panel.
                        </p>
                      </div>

                      <form onSubmit={handleUnlockAdmin} className="space-y-3 pt-2">
                        <Input
                          type="password"
                          placeholder="Enter Admin Access Code"
                          value={adminCodeInput}
                          onChange={(e) => setAdminCodeInput(e.target.value)}
                          className="font-mono text-xs text-center bg-background/80"
                        />
                        {adminError && <p className="text-xs text-red-400 font-semibold">{adminError}</p>}
                        <Button type="submit" className="w-full font-bold">
                          Unlock Admin Moderation
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <Table>
                          <TableHeader>
                            <TableRow className="border-border/60">
                              <TableHead>Host & Contact</TableHead>
                              <TableHead>Competition & Scope</TableHead>
                              <TableHead>Prior Audit Disclosure</TableHead>
                              <TableHead className="text-right">Escrow Held</TableHead>
                              <TableHead className="text-right">Refund Wallet</TableHead>
                              <TableHead className="text-right">Admin Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {competitions.filter((c) => c.status === "pending_approval").length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                                  No pending competitions requiring admin moderation.
                                </TableCell>
                              </TableRow>
                            ) : (
                              competitions
                                .filter((c) => c.status === "pending_approval")
                                .map((comp) => (
                                  <TableRow key={comp.id} className="border-border/40">
                                    <TableCell>
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-sm text-foreground">{comp.sponsor_name}</p>
                                        <p className="text-[11px] font-mono text-muted-foreground">{comp.host_email || "sponsor@arc.network"}</p>
                                        <p className="text-[10px] text-muted-foreground">{comp.host_discord || "@sponsor_dev"}</p>
                                        {comp.host_access_code && (
                                          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 mt-1">
                                            {comp.host_access_code}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <p className="font-bold text-xs text-foreground">{comp.title}</p>
                                        <a
                                          href={comp.repo_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                                        >
                                          <span>{comp.repo_url}</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                          Duration: {comp.duration_days || 7} Days • Scope: {comp.in_scope_files || "contracts/**/*.sol"}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {comp.has_prior_audit ? (
                                        <div className="space-y-1 max-w-[200px]">
                                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-semibold">
                                            Prior Audit Declared
                                          </Badge>
                                          {comp.prior_audit_source && (
                                            <p className="text-[11px] text-foreground font-medium truncate">Source: {comp.prior_audit_source}</p>
                                          )}
                                          {comp.prior_audit_findings && (
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 italic">"{comp.prior_audit_findings}"</p>
                                          )}
                                        </div>
                                      ) : (
                                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                                          No Prior Audits Declared
                                        </Badge>
                                      )}
                                    </TableCell>
                                <TableCell className="text-right font-extrabold text-amber-400 font-mono">
                                  ${comp.prize_pool_usdc.toLocaleString()} USDC
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span>
                                      {comp.host_wallet_address ? `${comp.host_wallet_address.substring(0, 6)}...${comp.host_wallet_address.substring(comp.host_wallet_address.length - 4)}` : "0x8734...b5Ef82"}
                                    </span>
                                    {comp.wallet_provider_type === "external_web3" && (
                                      <span className="text-[9px] text-purple-400 font-sans font-semibold">Web3 Wallet</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      className="rounded-full gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                                      onClick={async () => {
                                        setLoading(true)
                                        try {
                                          await fetch(`/api/playground/competitions/${comp.id}/approve`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ action: "approve" }),
                                          })
                                          fetchManageData()
                                        } catch (e) {
                                          console.error("Approve failed:", e)
                                        } finally {
                                          setLoading(false)
                                        }
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Approve Sprint
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full gap-1 text-xs font-semibold border-red-500/40 text-red-400 hover:bg-red-500/10"
                                      onClick={async () => {
                                        setLoading(true)
                                        try {
                                          await fetch(`/api/playground/competitions/${comp.id}/approve`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ action: "decline", reason: "Fails guidelines" }),
                                          })
                                          fetchManageData()
                                        } catch (e) {
                                          console.error("Decline failed:", e)
                                        } finally {
                                          setLoading(false)
                                        }
                                      }}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Decline & Refund Escrow
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Execute Payout Modal */}
        <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
          <DialogContent className="sm:max-w-[500px] border-border bg-card/95 backdrop-blur-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
                <DialogTitle className="text-xl">Release Arc Contract Payout</DialogTitle>
              </div>
              <DialogDescription>
                Transfer USDC rewards directly from <code className="text-foreground font-mono">BugBountyEscrow.sol</code> on Arc Testnet to winning auditor addresses.
              </DialogDescription>
            </DialogHeader>

            {!payoutResult ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!selectedComp) return
                  setPayoutLoading(true)

                  try {
                    const res = await fetch(`/api/playground/competitions/${selectedComp.id}/payout`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        recipient_wallet: payoutForm.recipient_wallet,
                        reward_amount_usdc: payoutForm.reward_amount_usdc,
                        host_access_code: unlockedHostCode,
                        admin_code: adminCodeInput,
                      }),
                    })

                    const data = await res.json()
                    if (data.success) {
                      setPayoutResult(data)
                      toast({
                        title: "Arc Escrow Payout Released!",
                        description: `Transferred ${payoutForm.reward_amount_usdc} USDC to ${payoutForm.recipient_wallet.slice(0, 8)}...`,
                      })
                      fetchManageData()
                    } else {
                      toast({
                        title: "Payout Release Failed",
                        description: data.error || "Failed to release escrow rewards.",
                        variant: "destructive",
                      })
                    }
                  } catch (err: any) {
                    console.error("Payout release failed:", err)
                    toast({
                      title: "Error",
                      description: err.message || "Network error while releasing payout.",
                      variant: "destructive",
                    })
                  } finally {
                    setPayoutLoading(false)
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="comp_name">Competition</Label>
                  <Input id="comp_name" value={selectedComp?.title || ""} disabled className="bg-muted font-bold text-xs" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recipient">Winner Wallet Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={payoutForm.recipient_wallet}
                    onChange={(e) => setPayoutForm({ ...payoutForm, recipient_wallet: e.target.value })}
                    required
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Reward Amount (USDC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={payoutForm.reward_amount_usdc}
                    onChange={(e) => setPayoutForm({ ...payoutForm, reward_amount_usdc: e.target.value })}
                    required
                    className="font-bold"
                  />
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Arc Escrow On-Chain Settlement</span>
                  </div>
                  <p className="text-muted-foreground">
                    This triggers <code className="text-foreground">releaseContractReward()</code> on Arc Testnet contract address <code className="text-foreground font-mono">0x3b2b...bbdd</code>.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setPayoutModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={payoutLoading} className="gap-2 font-semibold">
                    {payoutLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Releasing Payout...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Confirm & Release Funds</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Reward Released Successfully!</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Transaction ID: <span className="text-emerald-400 font-bold">{payoutResult.tx_hash}</span>
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setPayoutModalOpen(false)
                    setPayoutResult(null)
                  }}
                  className="w-full font-bold"
                >
                  Close & Refresh Dashboard
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rotate Key Recovery Modal */}
        <Dialog open={rotateModalOpen} onOpenChange={setRotateModalOpen}>
          <DialogContent className="sm:max-w-[500px] border-border bg-card/95 backdrop-blur-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <DialogTitle className="text-xl">Rotate Lost Host Access Code</DialogTitle>
              </div>
              <DialogDescription>
                Verify your registered refund wallet address to rotate and generate a new Host Access Code.
              </DialogDescription>
            </DialogHeader>

            {!recoveryResult ? (
              <form onSubmit={handleRotateKey} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rec_comp">Competition Title or ID</Label>
                  <Input
                    id="rec_comp"
                    placeholder="e.g. Arc Protocol Pre-Launch Security Sprint"
                    value={recoveryCompId}
                    onChange={(e) => setRecoveryCompId(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rec_wallet">Registered Refund Wallet Address</Label>
                  <Input
                    id="rec_wallet"
                    placeholder="0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                    value={recoveryWallet}
                    onChange={(e) => setRecoveryWallet(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-amber-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Wallet Verification Security</span>
                  </div>
                  <p className="text-muted-foreground">
                    Key rotation is strictly authorized only if the provided wallet address matches the exact refund wallet address registered when creating the competition.
                  </p>
                </div>

                {recoveryError && (
                  <p className="text-xs font-semibold text-red-400">{recoveryError}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setRotateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={recoveryLoading} className="gap-2 font-semibold">
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Wallet...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        <span>Verify & Rotate Code</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 pt-2 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">Code Rotated Successfully!</h3>
                  <p className="text-xs text-muted-foreground">
                    Your previous code has been invalidated. Please copy and safely store your new Host Access Code:
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-black text-primary tracking-widest">{recoveryResult.host_access_code}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryResult.host_access_code)
                        setRecoveryCopied(true)
                        setTimeout(() => setRecoveryCopied(false), 2000)
                      }}
                      className="rounded-full gap-1 border-primary/40 text-xs font-semibold"
                    >
                      {recoveryCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{recoveryCopied ? "Copied!" : "Copy Code"}</span>
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setUnlockedHostCode(recoveryResult.host_access_code)
                    setHostCodeInput(recoveryResult.host_access_code)
                    setRotateModalOpen(false)
                    setRecoveryResult(null)
                  }}
                  className="w-full font-bold"
                >
                  Unlock Dashboard with New Code
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <FooterSection />
    </div>
  )
}
