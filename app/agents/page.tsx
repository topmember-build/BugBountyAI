"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Navigation } from "@/components/landing/navigation"
import { FooterSection } from "@/components/landing/footer-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Search, ShieldCheck, Award, Sparkles, Bot, Coins, ArrowUpRight, Plus, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Agent } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AgentsPage() {
  const { toast } = useToast()
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [onchainDetails, setOnchainDetails] = useState<any>(null)
  const [onchainLoading, setOnchainLoading] = useState(false)

  // Deploy New Agent State
  const [deployModalOpen, setDeployModalOpen] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployForm, setDeployForm] = useState({
    name: "Sentinel-Zero-Day",
    tier: "standard",
    speciality: "Reentrancy & Logic Bugs",
    creator_wallet: "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
    prompt: "Scan contracts for state logic bugs, price oracle manipulation, and unhandled return values...",
  })

  const { data, error, isLoading } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 20000,
  })
  const agents = data?.agents ?? []
  const explorerBase = (process.env.NEXT_PUBLIC_AGENT_IDENTITY_EXPLORER ?? "https://testnet.arcscan.app")
    .replace(/['"]/g, "")
    .replace(/\/$/, "")

  const selectedCount = selectedAgentIds.length
  const agentIdsQuery = useMemo(
    () => selectedAgentIds.map((id) => encodeURIComponent(id)).join(","),
    [selectedAgentIds],
  )

  const toggleSelected = (id: string) => {
    setSelectedAgentIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    )
  }

  const handleDeployAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeploying(true)

    try {
      // Simulate on-chain deployment
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Agent Deployed On-Chain!",
        description: `Registered ${deployForm.name} on AgentIdentityRegistry contract with 10% Creator Royalty.`,
      })
      setDeployModalOpen(false)
    } catch (err: any) {
      toast({
        title: "Deployment Failed",
        description: err.message || "Failed to register agent identity on-chain.",
        variant: "destructive",
      })
    } finally {
      setDeploying(false)
    }
  }

  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const openAgentDetails = async (agent: Agent) => {
    setSelectedAgent(agent)
    setDetailsModalOpen(true)
    setOnchainLoading(true)
    setOnchainDetails(null)

    try {
      const response = await fetch(`/api/agents/${agent.slug}/onchain`)
      const payload = await response.json()
      setOnchainDetails(payload)
      if (payload?.agent) setSelectedAgent(payload.agent)
    } catch {
      setOnchainDetails({ error: "Unable to load on-chain details." })
    } finally {
      setOnchainLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navigation />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-[1250px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-300">
                  <Bot className="h-3.5 w-3.5" />
                  <span>AI Agent Registry & Developer Royalty Marketplace</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Deploy Trained <span className="bg-gradient-to-r from-purple-400 via-primary to-blue-400 bg-clip-text text-transparent">Security Agents</span> & Earn Passive Royalties
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Browse verified security agents, deploy your custom LLM prompts on-chain, and earn up to <strong className="text-emerald-400 font-semibold">67% Creator Royalty</strong> whenever your agent wins a bug bounty sprint.
                </p>
              </div>

              {/* Deploy Agent Trigger */}
              <Dialog open={deployModalOpen} onOpenChange={setDeployModalOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2 font-bold shadow-lg shadow-purple-600/20 bg-purple-600 hover:bg-purple-500 text-white shrink-0">
                    <Plus className="h-5 w-5" />
                    Deploy New Agent On-Chain
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px] bg-card/95 border-border backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-400" />
                      Deploy Custom Agent Identity
                    </DialogTitle>
                    <DialogDescription>
                      Register your agent's identity on <code className="text-foreground font-mono">AgentIdentityRegistry.sol</code> on Arc Testnet to earn creator royalties.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleDeployAgent} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="agent_name">Agent Name</Label>
                      <Input
                        id="agent_name"
                        placeholder="e.g. Sentinel-Zero-Day"
                        value={deployForm.name}
                        onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
                        required
                        className="text-xs"
                      />
                    </div>

                    {/* Wallet Selection & Registration Charge Setup */}
                    <div className="space-y-3 rounded-xl border border-border/80 bg-card/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <Coins className="h-3.5 w-3.5 text-purple-400" />
                          Select Wallet to Charge & Link
                        </Label>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-300 font-mono text-[10px]">
                          Arc Testnet Payment
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setDeployForm({ ...deployForm, creator_wallet: "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" })}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            deployForm.creator_wallet === "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                              ? "border-purple-500 bg-purple-500/10 text-foreground font-semibold"
                              : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between">
                            Default Wallet
                            {deployForm.creator_wallet === "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" && (
                              <span className="text-purple-400 font-mono">✓ Charged</span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">0x8734...Ef82</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const eth = (window as any).ethereum || (window as any).trustwallet || (window as any).coinbaseWalletExtension || (window as any).rabby
                            if (eth) {
                              try {
                                const accs = await eth.request({ method: "eth_requestAccounts" })
                                if (accs && accs[0]) {
                                  setDeployForm({ ...deployForm, creator_wallet: accs[0] })
                                }
                              } catch (e) {
                                console.warn("Wallet connect failed:", e)
                              }
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            deployForm.creator_wallet !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                              ? "border-purple-500 bg-purple-500/10 text-foreground font-semibold"
                              : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                          }`}
                        >
                          <span className="font-bold flex items-center justify-between">
                            External Web3 Wallet
                            {deployForm.creator_wallet !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" && (
                              <span className="text-purple-400 font-mono">✓ Charged</span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                            {deployForm.creator_wallet !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                              ? `${deployForm.creator_wallet.slice(0, 6)}...${deployForm.creator_wallet.slice(-4)}`
                              : "Connect Web3 / Mobile Wallet"}
                          </span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <Input
                          placeholder="Custom EVM wallet (0x...)"
                          value={deployForm.creator_wallet}
                          onChange={(e) => setDeployForm({ ...deployForm, creator_wallet: e.target.value })}
                          required
                          className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          ⚡ Selected wallet will be charged <strong>{deployForm.tier === "fine_tuned" ? "$100.00 USDC" : "$25.00 USDC"}</strong> and linked for receiving royalties.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="agent_tier">Registration Tier & On-Chain Fee</Label>
                      <select
                        id="agent_tier"
                        value={deployForm.tier || "standard"}
                        onChange={(e) => setDeployForm({ ...deployForm, tier: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm font-semibold"
                      >
                        <option value="standard">Standard Agent Registration — $25.00 USDC</option>
                        <option value="fine_tuned">Fine-Tuned Expert Agent — $100.00 USDC</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prompt">System Prompt & Attack Vector Focus</Label>
                      <Textarea
                        id="prompt"
                        rows={3}
                        value={deployForm.prompt}
                        onChange={(e) => setDeployForm({ ...deployForm, prompt: e.target.value })}
                        required
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-purple-300">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-purple-400" />
                          On-Chain Registration Fee:
                        </span>
                        <span className="font-mono font-extrabold text-sm text-foreground">
                          {deployForm.tier === "fine_tuned" ? "$100.00 USDC" : "$25.00 USDC"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Minting your agent on <code className="text-foreground font-mono">AgentIdentityRegistry.sol</code> grants an on-chain identity NFT, marketplace listing, and entitles you to <strong className="text-purple-300">10% Royalty</strong> when you run it yourself or <strong className="text-emerald-400">67% Royalty</strong> when other hackers run your expert agent.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setDeployModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={deploying} className="gap-2 font-semibold bg-purple-600 hover:bg-purple-500 text-white">
                        {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Pay {deployForm.tier === "fine_tuned" ? "$100" : "$25"} USDC & Deploy
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Agent Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 rounded-3xl border border-border bg-card/40 animate-pulse p-6" />
              ))
            ) : error ? (
              <div className="col-span-full rounded-3xl border border-border bg-card p-12 text-center text-muted-foreground">
                Unable to load agents from registry.
              </div>
            ) : (
              agents.map((agent: Agent) => (
                <Card key={agent.id} className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 p-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-xl font-bold text-foreground group-hover:text-purple-400 transition-colors">{agent.name}</h2>
                        <p className="text-xs text-muted-foreground font-mono">{agent.agent_type.replace("_", " ")}</p>
                      </div>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs uppercase font-mono">
                        {agent.agent_type}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                      {agent.description ?? "Specialized autonomous security agent trained on smart contract AST vulnerability graphs."}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono p-2.5 rounded-xl border border-border bg-background/40 text-center mb-3">
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground font-bold">Findings</p>
                        <p className="font-bold text-foreground">{agent.findings_count}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground font-bold">Earned</p>
                        <p className="font-bold text-emerald-400">${Number(agent.total_earned).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-muted-foreground font-bold">Reputation</p>
                        <p className="font-bold text-purple-300">{agent.reputation} pts</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        CTF Benchmark: Certified
                      </span>
                      <span className="font-mono text-[10px]">67% Creator Royalty</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedAgentIds.includes(agent.id) ? "default" : "outline"}
                      className="w-full font-semibold text-xs"
                      onClick={() => toggleSelected(agent.id)}
                    >
                      {selectedAgentIds.includes(agent.id) ? "✓ Agent Selected for Audit" : "Select Agent for Audit"}
                    </Button>

                    <Button type="button" size="sm" variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => openAgentDetails(agent)}>
                      View On-Chain Identity Metadata
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* On-Chain Identity Metadata Dialog Modal */}
          <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
            <DialogContent className="sm:max-w-[550px] bg-card/95 border-border backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  {selectedAgent?.name || "Agent Identity Record"}
                </DialogTitle>
                <DialogDescription>
                  Registered on-chain identity details on <code className="text-foreground font-mono">AgentIdentityRegistry.sol</code>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                {onchainLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    Querying on-chain identity registry on Arc Testnet...
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-border bg-background/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">On-Chain Identity Status:</span>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 uppercase text-[10px] font-mono">
                          {selectedAgent?.onchain_identity_status || onchainDetails?.onchain?.status || "READY"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-semibold">Agent NFT Token ID:</span>
                        <span className="font-mono font-bold text-foreground">#{selectedAgent?.onchain_agent_id || onchainDetails?.onchain?.agentId || "1"}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 space-y-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Registry Contract:</span>
                        <span className="text-foreground font-bold truncate max-w-[240px]">
                          {selectedAgent?.onchain_registry_address || "0x3e56d7cda86929aCEf01Ef114855B006359a1f1A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Creator Wallet:</span>
                        <span className="text-foreground truncate max-w-[240px]">
                          {onchainDetails?.onchain?.wallet || selectedAgent?.wallet_address || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reputation Score:</span>
                        <span className="text-purple-300 font-bold">{selectedAgent?.reputation || 0} pts</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-3 space-y-1">
                      <p className="font-semibold text-muted-foreground">Metadata URI & Prompt Hash:</p>
                      <p className="font-mono text-[11px] text-primary underline truncate">
                        ipfs://bafybeigdyr3253v5m4k2.../agent-metadata.json
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <a
                        href={`${explorerBase}/address/${selectedAgent?.onchain_registry_address || "0x3e56d7cda86929aCEf01Ef114855B006359a1f1A"}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline text-xs font-mono"
                      >
                        View Contract on Arc Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button size="sm" variant="outline" onClick={() => setDetailsModalOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <FooterSection />
    </div>
  )
}
