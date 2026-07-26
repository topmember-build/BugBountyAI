"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { computeHostPaymentBreakdown } from "@/lib/fees"
import { Trophy, ShieldCheck, Zap, Plus, ExternalLink, Code2, FolderArchive, FileCode, UploadCloud, Check, Copy, AlertTriangle, FileWarning, SearchCheck, CalendarDays, Loader2, Scale, Clock, Sparkles, Wallet, CheckCircle2 } from "lucide-react"

export function HostCompetitionModal({ onCreated }: { onCreated?: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdComp, setCreatedComp] = useState<any>(null)
  
  // External Wallet state & mode: "external" | "default" | "custom"
  const [walletMode, setWalletMode] = useState<"external" | "default" | "custom">("external")
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [connectedExternalWallet, setConnectedExternalWallet] = useState<string | null>(null)
  const [walletProviderType, setWalletProviderType] = useState<string>("external_web3")

  const handleConnectExternalWallet = async () => {
    setIsConnectingWallet(true)
    try {
      const eth = (window as any).ethereum || (window as any).trustwallet || (window as any).coinbaseWalletExtension || (window as any).rabby
      if (!eth) {
        toast({
          title: "No Web3 Wallet Extension Detected",
          description: "No EVM wallet (MetaMask, Rabby, Coinbase Wallet) found in browser. You can paste your external wallet address directly.",
          variant: "destructive",
        })
        setWalletMode("custom")
        return
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" })
      if (accounts && accounts[0]) {
        const address = accounts[0]
        setConnectedExternalWallet(address)
        setFormData((prev) => ({ ...prev, host_wallet_address: address }))
        setWalletMode("external")
        setWalletProviderType("external_web3")
        toast({
          title: "External Web3 Wallet Connected!",
          description: `Connected ${address.substring(0, 6)}...${address.substring(address.length - 4)} for hosting & refunds.`,
        })
      }
    } catch (err: any) {
      console.warn("External wallet connection error:", err)
      toast({
        title: "Wallet Connection Failed",
        description: err?.message || "Failed to connect external wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnectingWallet(false)
    }
  }

  const [formData, setFormData] = useState({
    title: "",
    sponsor_name: "",
    host_email: "",
    host_discord: "",
    host_wallet_address: "",
    description: "",
    category: "Smart Contracts",
    repo_url: "",
    code_source_type: "github",
    raw_code_content: "",
    uploaded_file_name: "",
    contract_filename: "VaultManager.sol",
    branch: "main",
    in_scope_files: "contracts/**/*.sol",
    out_of_scope_files: "test/**/*, scripts/**/*",
    prize_pool_usdc: "2500",
    duration_days: "7",
    registration_days: "3",
    max_winners: "5",
    distribution_mode: "severity_weighted",
    custom_split_ratios_str: "50, 30, 20",
    has_prior_audit: false,
    prior_audit_source: "",
    prior_audit_date: "",
    prior_audit_findings: "",
    prior_audit_report_url: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const customRatios = formData.custom_split_ratios_str
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)

      const paymentBreakdown = computeHostPaymentBreakdown(formData.prize_pool_usdc)

      const res = await fetch("/api/playground/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          wallet_provider_type: walletProviderType,
          hosting_fee_usdc: paymentBreakdown.hosting_fee,
          total_payable_usdc: paymentBreakdown.total_host_payment,
          net_auditor_pool_usdc: paymentBreakdown.net_auditor_pool,
          protocol_escrow_fee_usdc: paymentBreakdown.protocol_escrow_fee,
          custom_split_ratios: customRatios,
          has_prior_audit: formData.has_prior_audit,
          prior_audit_source: formData.prior_audit_source || null,
          prior_audit_date: formData.prior_audit_date || null,
          prior_audit_findings: formData.prior_audit_findings || null,
          prior_audit_report_url: formData.prior_audit_report_url || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setCreatedComp(data.competition)
        toast({
          title: "Audit Sprint Hosted Successfully!",
          description: "Your sprint has been submitted and is pending admin moderation.",
        })
        if (onCreated) onCreated()
      } else {
        toast({
          title: "Hosting Submission Failed",
          description: data.error || "Please check your input parameters.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Failed to host competition:", err)
      toast({
        title: "Error",
        description: err.message || "An unexpected network error occurred.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyHostCode = () => {
    if (createdComp?.host_access_code) {
      navigator.clipboard.writeText(createdComp.host_access_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCreatedComp(null)
    setFormData({
      title: "",
      sponsor_name: "",
      host_email: "",
      host_discord: "",
      host_wallet_address: "",
      description: "",
      category: "Smart Contracts",
      repo_url: "",
      code_source_type: "github",
      raw_code_content: "",
      uploaded_file_name: "",
      contract_filename: "VaultManager.sol",
      branch: "main",
      in_scope_files: "contracts/**/*.sol",
      out_of_scope_files: "test/**/*, scripts/**/*",
      prize_pool_usdc: "2500",
      duration_days: "7",
      registration_days: "3",
      max_winners: "5",
      distribution_mode: "severity_weighted",
      custom_split_ratios_str: "50, 30, 20",
      has_prior_audit: false,
      prior_audit_source: "",
      prior_audit_date: "",
      prior_audit_findings: "",
      prior_audit_report_url: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4" />
          <span>Host a Competition</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] border-border bg-card/95 backdrop-blur-2xl max-h-[85vh] overflow-y-auto">
        {!createdComp ? (
          <>
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <DialogTitle className="text-xl">Host an Audit Competition</DialogTitle>
              </div>
              <DialogDescription>
                Set event duration and lock USDC rewards in smart contract escrow on Arc Testnet. Submissions enter escrow holding until verified by Admin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Competition Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Arc Bridge V2 Pre-Launch Security Sprint"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sponsor">Sponsor / Team Name</Label>
                  <Input
                    id="sponsor"
                    placeholder="e.g. Arc Labs"
                    value={formData.sponsor_name}
                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Smart Contracts">Smart Contracts</SelectItem>
                      <SelectItem value="DeFi">DeFi Protocols</SelectItem>
                      <SelectItem value="AI Agents">AI Agents / ML</SelectItem>
                      <SelectItem value="Developer Tooling">Developer Tooling</SelectItem>
                      <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Details & Host Payment / Refund Wallet Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="host_email">Contact Email</Label>
                  <Input
                    id="host_email"
                    type="email"
                    placeholder="sponsor@arc.network"
                    value={formData.host_email}
                    onChange={(e) => setFormData({ ...formData, host_email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="host_discord">Discord Handle</Label>
                  <Input
                    id="host_discord"
                    placeholder="@sponsor_dev"
                    value={formData.host_discord}
                    onChange={(e) => setFormData({ ...formData, host_discord: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Host Payment & Refund Wallet Selection Card */}
              <div className="space-y-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                    <Wallet className="h-4 w-4 text-purple-400" />
                    <span>Host Funding & Refund Wallet Address</span>
                  </div>
                  {formData.host_wallet_address && (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] gap-1 py-0.5 font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      {walletMode === "external" ? "External Web3 Wallet Connected" : walletMode === "default" ? "Platform Default Wallet" : "Custom Address Configured"}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {/* Option 1: External Web3 Wallet */}
                  <button
                    type="button"
                    onClick={handleConnectExternalWallet}
                    disabled={isConnectingWallet}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      walletMode === "external" && formData.host_wallet_address
                        ? "border-purple-500 bg-purple-500/15 text-foreground font-semibold shadow-sm"
                        : "border-border bg-background/50 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-purple-400" />
                        Connect External
                      </span>
                      {walletMode === "external" && formData.host_wallet_address && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 truncate">
                      {isConnectingWallet ? (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                        </span>
                      ) : connectedExternalWallet ? (
                        `${connectedExternalWallet.slice(0, 6)}...${connectedExternalWallet.slice(-4)}`
                      ) : (
                        "MetaMask / Web3"
                      )}
                    </span>
                  </button>

                  {/* Option 2: Platform Default Wallet */}
                  <button
                    type="button"
                    onClick={() => {
                      const def = "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                      setFormData((prev) => ({ ...prev, host_wallet_address: def }))
                      setWalletMode("default")
                      setWalletProviderType("platform_default")
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      walletMode === "default"
                        ? "border-purple-500 bg-purple-500/15 text-foreground font-semibold shadow-sm"
                        : "border-border bg-background/50 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Platform Default
                      </span>
                      {walletMode === "default" && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
                      0x8734...b5Ef82
                    </span>
                  </button>

                  {/* Option 3: Custom Manual EVM Input */}
                  <button
                    type="button"
                    onClick={() => {
                      setWalletMode("custom")
                      setWalletProviderType("custom_address")
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      walletMode === "custom"
                        ? "border-purple-500 bg-purple-500/15 text-foreground font-semibold shadow-sm"
                        : "border-border bg-background/50 text-muted-foreground hover:border-purple-500/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <Code2 className="h-3.5 w-3.5 text-blue-400" />
                        Custom Address
                      </span>
                      {walletMode === "custom" && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 truncate">
                      Paste Any EVM Wallet
                    </span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="host_wallet" className="text-[11px] font-medium text-muted-foreground">
                      Active Refund & Recovery Address
                    </Label>
                    {connectedExternalWallet && walletMode === "external" && (
                      <button
                        type="button"
                        onClick={handleConnectExternalWallet}
                        className="text-[10px] text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Switch Connected Account
                      </button>
                    )}
                  </div>
                  <Input
                    id="host_wallet"
                    placeholder="0x..."
                    value={formData.host_wallet_address}
                    onChange={(e) => {
                      setFormData({ ...formData, host_wallet_address: e.target.value })
                      if (walletMode !== "custom") setWalletMode("custom")
                    }}
                    className="font-mono text-xs bg-background/80"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This wallet receives refunds if unallocated funds remain in escrow and serves as your key identity for competition recovery.
                  </p>
                </div>
              </div>

              {/* Multi-Modal Code Source Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Code Source & Target Audit Artifacts</Label>
                <Tabs
                  value={formData.code_source_type}
                  onValueChange={(val) => setFormData({ ...formData, code_source_type: val })}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-4 bg-muted/60 p-1 rounded-xl text-xs">
                    <TabsTrigger value="github" className="rounded-lg gap-1 text-[11px] font-semibold">
                      <Code2 className="h-3.5 w-3.5" />
                      <span>GitHub</span>
                    </TabsTrigger>
                    <TabsTrigger value="zip" className="rounded-lg gap-1 text-[11px] font-semibold">
                      <FolderArchive className="h-3.5 w-3.5 text-purple-400" />
                      <span>ZIP Archive</span>
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="rounded-lg gap-1 text-[11px] font-semibold">
                      <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Paste Code</span>
                    </TabsTrigger>
                    <TabsTrigger value="files" className="rounded-lg gap-1 text-[11px] font-semibold">
                      <UploadCloud className="h-3.5 w-3.5 text-blue-400" />
                      <span>Files</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* GitHub Tab */}
                  <TabsContent value="github" className="pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor="repo" className="text-xs">GitHub Repository URL</Label>
                        <Input
                          id="repo"
                          placeholder="https://github.com/org/repo"
                          value={formData.repo_url}
                          onChange={(e) => setFormData({ ...formData, repo_url: e.target.value })}
                          required={formData.code_source_type === "github"}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="branch" className="text-xs">Branch</Label>
                        <Input
                          id="branch"
                          placeholder="main"
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ZIP Archive Tab */}
                  <TabsContent value="zip" className="pt-2 space-y-2">
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-background/40">
                      <FolderArchive className="h-7 w-7 mx-auto text-purple-400 mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">Upload Source Code Archive (.zip, .tar.gz)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Drag & drop your repository folder or ZIP archive here</p>
                      <input
                        type="file"
                        accept=".zip,.tar,.gz,.7z"
                        className="hidden"
                        id="zip-file-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setFormData({ ...formData, uploaded_file_name: file.name })
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById("zip-file-input")?.click()}
                        className="mt-2.5 rounded-full gap-1.5 text-xs font-semibold"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Select ZIP File</span>
                      </Button>
                      {formData.uploaded_file_name && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 font-mono">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Selected: {formData.uploaded_file_name}</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Paste Code Tab */}
                  <TabsContent value="paste" className="pt-2 space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="contract_name" className="text-xs">Contract File Name</Label>
                      <Input
                        id="contract_name"
                        placeholder="VaultManager.sol"
                        value={formData.contract_filename}
                        onChange={(e) => setFormData({ ...formData, contract_filename: e.target.value })}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="raw_code" className="text-xs">Paste Smart Contract Source Code</Label>
                      <Textarea
                        id="raw_code"
                        placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.20;&#10;&#10;contract VaultManager {&#10;    // Paste contract logic here...&#10;}"
                        rows={4}
                        value={formData.raw_code_content}
                        onChange={(e) => setFormData({ ...formData, raw_code_content: e.target.value })}
                        required={formData.code_source_type === "paste"}
                        className="font-mono text-xs leading-relaxed bg-background/80"
                      />
                    </div>
                  </TabsContent>

                  {/* Contract Files Tab */}
                  <TabsContent value="files" className="pt-2 space-y-2">
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-background/40">
                      <FileCode className="h-7 w-7 mx-auto text-blue-400 mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">Upload Smart Contract Files</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Select .sol, .rs, .vy, or .cairo files</p>
                      <input
                        type="file"
                        multiple
                        accept=".sol,.rs,.vy,.move,.cairo"
                        className="hidden"
                        id="contract-files-input"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length > 0) {
                            setFormData({ ...formData, uploaded_file_name: files.map(f => f.name).join(", ") })
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById("contract-files-input")?.click()}
                        className="mt-2.5 rounded-full gap-1.5 text-xs font-semibold"
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Select Contract Files</span>
                      </Button>
                      {formData.uploaded_file_name && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300 font-mono">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Selected: {formData.uploaded_file_name}</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Scope & Event Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="in_scope">In-Scope Files</Label>
                  <Input
                    id="in_scope"
                    placeholder="contracts/**/*.sol"
                    value={formData.in_scope_files}
                    onChange={(e) => setFormData({ ...formData, in_scope_files: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg_duration">Registration Window</Label>
                  <Select value={formData.registration_days} onValueChange={(val) => setFormData({ ...formData, registration_days: val })}>
                    <SelectTrigger id="reg_duration">
                      <SelectValue placeholder="Registration Window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 Days (Immediate Start)</SelectItem>
                      <SelectItem value="1">1 Day (24h Flash Start)</SelectItem>
                      <SelectItem value="3">3 Days (Standard)</SelectItem>
                      <SelectItem value="7">7 Days (Announcement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Sprint Duration</Label>
                  <Select value={formData.duration_days} onValueChange={(val) => setFormData({ ...formData, duration_days: val })}>
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Days (Sprint)</SelectItem>
                      <SelectItem value="7">7 Days (Standard)</SelectItem>
                      <SelectItem value="14">14 Days (Comprehensive)</SelectItem>
                      <SelectItem value="30">30 Days (Extended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prize">Prize Pool (USDC)</Label>
                  <Input
                    id="prize"
                    type="number"
                    placeholder="2500"
                    value={formData.prize_pool_usdc}
                    onChange={(e) => setFormData({ ...formData, prize_pool_usdc: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Itemized Financial Breakdown Card */}
              {(() => {
                const breakdown = computeHostPaymentBreakdown(formData.prize_pool_usdc)
                return (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Itemized Host Deposit & Payment Summary
                      </span>
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono">
                        +$50 USDC Hosting Fee
                      </Badge>
                    </div>

                    <div className="space-y-1 text-muted-foreground pt-1 border-t border-amber-500/10">
                      <div className="flex items-center justify-between text-xs">
                        <span>Auditor Reward Prize Pool:</span>
                        <span className="font-mono font-semibold text-foreground">${breakdown.prize_pool.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          Platform Hosting & Setup Fee:
                          <span className="text-[10px] text-amber-400/90 font-mono">(Static Analysis + AI LLM Tokens + Sandbox)</span>
                        </span>
                        <span className="font-mono font-bold text-amber-400">+${breakdown.hosting_fee} USDC</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pl-2">
                        <span>↳ Net Auditor Reward Allocation (97%):</span>
                        <span className="font-mono">${breakdown.net_auditor_pool.toLocaleString()} USDC</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pl-2">
                        <span>↳ Protocol Escrow Fee (3%):</span>
                        <span className="font-mono">${breakdown.protocol_escrow_fee.toLocaleString()} USDC</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs font-bold text-foreground">
                      <span>Total Required Host Payment:</span>
                      <span className="font-mono text-sm text-emerald-400">${breakdown.total_host_payment.toLocaleString()} USDC</span>
                    </div>
                  </div>
                )
              })()}

              {/* Prize Distribution & Winners Configuration */}
              <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-emerald-400" />
                    Prize Distribution & Winner Rules
                  </span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                    Host Customizable
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="max_winners" className="text-xs">Max Winners Count</Label>
                    <Select value={formData.max_winners} onValueChange={(val) => setFormData({ ...formData, max_winners: val })}>
                      <SelectTrigger id="max_winners">
                        <SelectValue placeholder="Select Winners Count" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Winner (Winner-Takes-All)</SelectItem>
                        <SelectItem value="3">Top 3 Winners</SelectItem>
                        <SelectItem value="5">Top 5 Winners (Standard)</SelectItem>
                        <SelectItem value="10">Top 10 Winners (Extended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dist_mode" className="text-xs">Distribution Structure</Label>
                    <Select value={formData.distribution_mode} onValueChange={(val) => setFormData({ ...formData, distribution_mode: val })}>
                      <SelectTrigger id="dist_mode">
                        <SelectValue placeholder="Select Distribution Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="severity_weighted">Severity-Weighted (Findings Based)</SelectItem>
                        <SelectItem value="rank_tiered">Rank-Tiered (Rank Percentages)</SelectItem>
                        <SelectItem value="winner_takes_all">Winner-Takes-All (100% to #1)</SelectItem>
                        <SelectItem value="custom_percentage">Custom Percentage Splits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.distribution_mode === "custom_percentage" && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="custom_splits" className="text-xs">Custom Percentage Splits (Comma Separated %)</Label>
                    <Input
                      id="custom_splits"
                      placeholder="50, 30, 20"
                      value={formData.custom_split_ratios_str}
                      onChange={(e) => setFormData({ ...formData, custom_split_ratios_str: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Example: "50, 30, 20" splits pool 50% to 1st, 30% to 2nd, 20% to 3rd.</p>
                  </div>
                )}

                {/* Live Payout Preview Box */}
                <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 text-[11px] space-y-1">
                  <p className="font-semibold text-foreground">Estimated Winner Payout Preview (${formData.prize_pool_usdc || "0"} USDC Pool):</p>
                  <div className="text-muted-foreground flex flex-wrap gap-2 pt-0.5">
                    {formData.distribution_mode === "winner_takes_all" || formData.max_winners === "1" ? (
                      <span className="text-emerald-400 font-mono">🥇 1st Place: ${(Number(formData.prize_pool_usdc) || 0).toLocaleString()} USDC (100%)</span>
                    ) : formData.distribution_mode === "rank_tiered" ? (
                      <>
                        <span className="text-emerald-400 font-mono">🥇 1st: ${( (Number(formData.prize_pool_usdc) || 0) * (formData.max_winners === "3" ? 0.6 : 0.5) ).toLocaleString()} (60/50%)</span>
                        <span className="text-blue-400 font-mono">🥈 2nd: ${( (Number(formData.prize_pool_usdc) || 0) * 0.25 ).toLocaleString()} (25%)</span>
                        <span className="text-purple-400 font-mono">🥉 3rd: ${( (Number(formData.prize_pool_usdc) || 0) * 0.15 ).toLocaleString()} (15%)</span>
                      </>
                    ) : (
                      <span>Dynamic severity pool allocations across Top {formData.max_winners} winning agents.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══════ Prior Audit Disclosure — Anti-Partiality Section ═══════ */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-amber-400" />
                    Prior Audit Disclosure
                  </span>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                    Fairness Protocol
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  To ensure fair and impartial judging, you must declare whether this project has been previously audited or scanned for vulnerabilities.
                  All disclosures are <strong className="text-foreground">timestamped and immutable</strong> — the AI Tribunal cross-references submissions against disclosed findings to prevent hosts from retroactively claiming prior knowledge of reported bugs.
                </p>

                {/* Toggle: Has Prior Audit? */}
                <div className="flex items-center gap-3 pt-1">
                  <Label className="text-xs font-semibold">Have you previously audited or scanned this project?</Label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, has_prior_audit: true })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        formData.has_prior_audit
                          ? "border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10"
                          : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, has_prior_audit: false, prior_audit_source: "", prior_audit_date: "", prior_audit_findings: "", prior_audit_report_url: "" })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        !formData.has_prior_audit
                          ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
                          : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Expanded: Prior Audit Details Form */}
                {formData.has_prior_audit && (
                  <div className="space-y-3 pt-2 border-t border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="prior_audit_source" className="text-xs flex items-center gap-1">
                          <SearchCheck className="h-3 w-3 text-amber-400" />
                          Audit Source / Provider
                        </Label>
                        <Select
                          value={formData.prior_audit_source}
                          onValueChange={(val) => setFormData({ ...formData, prior_audit_source: val })}
                        >
                          <SelectTrigger id="prior_audit_source">
                            <SelectValue placeholder="Select Audit Provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Internal Team">Internal Team</SelectItem>
                            <SelectItem value="CertiK">CertiK</SelectItem>
                            <SelectItem value="Trail of Bits">Trail of Bits</SelectItem>
                            <SelectItem value="OpenZeppelin">OpenZeppelin</SelectItem>
                            <SelectItem value="Consensys Diligence">Consensys Diligence</SelectItem>
                            <SelectItem value="Halborn">Halborn</SelectItem>
                            <SelectItem value="Code4rena">Code4rena</SelectItem>
                            <SelectItem value="Sherlock">Sherlock</SelectItem>
                            <SelectItem value="Slither / Automated Scanner">Slither / Automated Scanner</SelectItem>
                            <SelectItem value="Mythril / Automated Scanner">Mythril / Automated Scanner</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="prior_audit_date" className="text-xs flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-amber-400" />
                          Audit Date
                        </Label>
                        <Input
                          id="prior_audit_date"
                          type="date"
                          value={formData.prior_audit_date}
                          onChange={(e) => setFormData({ ...formData, prior_audit_date: e.target.value })}
                          required={formData.has_prior_audit}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prior_audit_findings" className="text-xs flex items-center gap-1">
                        <FileWarning className="h-3 w-3 text-amber-400" />
                        Previously Found Bugs & Findings
                      </Label>
                      <Textarea
                        id="prior_audit_findings"
                        rows={4}
                        placeholder={"List all bugs and findings from your previous audit(s).\n\nExample:\n- [Critical] Reentrancy in withdraw() — Fixed in commit abc123\n- [High] Unchecked return value in transfer() — Acknowledged, risk accepted\n- [Medium] Missing access control on setFee() — Fixed\n- [Low] Event not emitted on ownership transfer — Fixed"}
                        value={formData.prior_audit_findings}
                        onChange={(e) => setFormData({ ...formData, prior_audit_findings: e.target.value })}
                        required={formData.has_prior_audit}
                        className="font-mono text-xs leading-relaxed bg-background/80"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prior_audit_report_url" className="text-xs flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-amber-400" />
                        Audit Report URL <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="prior_audit_report_url"
                        placeholder="https://github.com/org/repo/blob/main/audit-report.pdf"
                        value={formData.prior_audit_report_url}
                        onChange={(e) => setFormData({ ...formData, prior_audit_report_url: e.target.value })}
                      />
                    </div>

                    {/* Immutability Warning */}
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-muted-foreground leading-relaxed">
                        <strong className="text-amber-300">Immutable Record:</strong> All disclosed findings are timestamped at submission and will be cross-referenced during AI Tribunal judging.
                        Any hacker submission matching a disclosed finding will be automatically flagged as a <strong className="text-foreground">"Known Issue"</strong>.
                        Undisclosed prior knowledge used to reject valid submissions may result in host penalties.
                      </p>
                    </div>
                  </div>
                )}

                {/* No Prior Audit — Green Acknowledgment */}
                {!formData.has_prior_audit && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] flex items-center gap-2 animate-in fade-in duration-300">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <p className="text-emerald-300/90">
                      <strong>No prior audits declared.</strong> Proceed to fill out the Sprint Description & Guidelines below. By continuing, you acknowledge that no prior vulnerability scans or audits have been performed on this codebase.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc">Sprint Description & Guidelines</Label>
                <Textarea
                  id="desc"
                  rows={3}
                  placeholder="Describe the architecture, primary security concerns, and specific invariant expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Clock className="h-4 w-4" />
                  <span>Competition Timers & Cooldown Pipeline</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your event runs for <strong className="text-foreground">{formData.duration_days} Days</strong>. After the sprint ends, a <strong className="text-foreground">3-Day Judging Cooldown</strong> allows hosts to review findings, followed by a <strong className="text-foreground">3-Day Escrow Cooldown</strong> before payouts are released.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2 font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Locking Escrow...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Deposit Escrow & Host</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-6 pt-2 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">Competition Submitted!</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your competition is now pending admin moderation. Use your unique <strong className="text-foreground">Host Access Code</strong> below to log into the Host Dashboard.
              </p>
            </div>

            {/* Host Code Display Box */}
            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 space-y-3">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Your Secret Host Access Code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-2xl font-black tracking-widest text-primary">{createdComp.host_access_code}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyHostCode}
                  className="rounded-full gap-1 border-primary/40 text-xs font-semibold"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied!" : "Copy Code"}</span>
                </Button>
              </div>
            </div>

            {/* Prominent Security Warning Notice */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-left text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Security Notice: Save Your Access Code</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Please copy and store your Host Access Code in a safe place. You will need it to log in and manage your competition. If lost, key rotation requires verification using your registered refund wallet address (<code className="text-foreground font-mono">{formData.host_wallet_address.substring(0, 6)}...{formData.host_wallet_address.substring(formData.host_wallet_address.length - 4)}</code>).
              </p>
            </div>

            {/* Cooldown Timers Summary */}
            <div className="grid grid-cols-3 gap-2 text-left text-xs p-3 rounded-xl border border-border bg-background/40 font-mono">
              <div>
                <p className="text-[10px] text-muted-foreground">Sprint Duration</p>
                <p className="font-bold text-foreground">{createdComp.duration_days || 7} Days</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Judging Cooldown</p>
                <p className="font-bold text-amber-400">3 Days</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Escrow Cooldown</p>
                <p className="font-bold text-purple-400">3 Days</p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full font-bold">
              Done & View Arena
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
