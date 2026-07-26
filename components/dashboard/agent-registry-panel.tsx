"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Loader2, Sparkles, Coins } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import type { Agent, AgentType } from "@/lib/types"

const agentTypes: Array<{ value: AgentType; label: string; hint: string }> = [
  { value: "security", label: "Security", hint: "Auth, injection, SSRF, access control" },
  { value: "logic", label: "Logic", hint: "Business logic, invariants, race conditions" },
  { value: "dependency", label: "Dependency", hint: "Package supply-chain and CVE coverage" },
  { value: "smart_contract", label: "Smart Contract", hint: "Reentrancy, economics, integer issues" },
]

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) {
      return { agents: [] }
    }

    throw new Error(data.error || res.statusText)
  }

  return data
}

export function AgentRegistryPanel() {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [agentType, setAgentType] = useState<AgentType>("security")
  const [description, setDescription] = useState("")
  const [focusAreas, setFocusAreas] = useState("")
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a disciplined bug bounty agent. Search for impactful vulnerabilities, explain the exploit path clearly, and prioritize real-world impact over noise."
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletVerified, setWalletVerified] = useState(false)
  const [verifyingWallet, setVerifyingWallet] = useState(false)

  const { data, isLoading, mutate } = useSWR<{ agents: Agent[] }>("/api/agents?mine=1", fetcher, {
    revalidateOnFocus: false,
  })

  const { data: walletsData, isLoading: walletsLoading, mutate: mutateWallets } = useSWR<{
    wallets: { address: string; created_at: string }[]
  }>("/api/wallets/list", fetcher, { revalidateOnFocus: false })


  const agents = data?.agents ?? []

  useEffect(() => {
    if (!walletsData?.wallets?.length || walletAddress) return
    const firstWallet = walletsData.wallets[0]?.address
    if (firstWallet) {
      setWalletAddress(firstWallet)
      setWalletVerified(true)
    }
  }, [walletAddress, walletsData])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          agent_type: agentType,
          description: description.trim(),
          focus_areas: focusAreas.trim(),
          system_prompt: systemPrompt.trim(),
          wallet_address: walletVerified ? walletAddress : null,
        }),
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Unable to register agent")

      setName("")
      setSlug("")
      setDescription("")
      setFocusAreas("")
      setSystemPrompt(
        "You are a disciplined bug bounty agent. Search for impactful vulnerabilities, explain the exploit path clearly, and prioritize real-world impact over noise."
      )
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConnectWallet = async () => {
    setError(null)
    try {
      const eth = (window as any).ethereum
      if (!eth) {
        setError("No EVM-compatible Web3 wallet detected in browser. You can paste any Web3 wallet address directly below.")
        return
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" })
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0])
        setWalletVerified(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleVerifyWallet = async () => {
    if (!walletAddress) return
    setVerifyingWallet(true)
    setError(null)
    try {
      // Request a server-generated nonce/message to sign
      const nonceRes = await fetch("/api/wallets/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      })
      const nonceBody = await nonceRes.json()
      if (!nonceRes.ok) throw new Error(nonceBody.error ?? "Unable to get nonce")

      const message = nonceBody.message
      const eth = (window as any).ethereum
      const signature = await eth.request({ method: "personal_sign", params: [message, walletAddress] })

      const res = await fetch("/api/wallets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature }),
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Verification failed")
      setWalletVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setVerifyingWallet(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> {t("register_trained_agent")}
          </CardTitle>
          <CardDescription>
            {t("register_agent_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-name">{t("agent_name")}</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Atlas Vault Scanner"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-slug">{t("slug")}</Label>
                <Input
                  id="agent-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="atlas-vault-scanner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-type">Specialty</Label>
              <select
                id="agent-type"
                value={agentType}
                onChange={(event) => setAgentType(event.target.value as AgentType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {agentTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {agentTypes.find((option) => option.value === agentType)?.hint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what your agent is trained to find and how it behaves."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-focus">Focus areas</Label>
              <Input
                id="agent-focus"
                value={focusAreas}
                onChange={(event) => setFocusAreas(event.target.value)}
                placeholder="e.g. IDOR, SSRF, token logic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-prompt">System prompt / instructions</Label>
              <Textarea
                id="agent-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="Define the internal rules and bug-hunting heuristics your agent should follow."
                rows={6}
                required
              />
            </div>

            {/* Wallet Selection & Registration Charge Setup */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Coins className="h-4 w-4 text-purple-400" />
                  Select Wallet to Charge & Link
                </Label>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300 font-mono text-[10px]">
                  Arc Testnet Payment
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setWalletAddress("0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82")
                    setWalletVerified(true)
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    walletAddress === "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" || !walletAddress
                      ? "border-purple-500 bg-purple-500/10 text-foreground font-semibold"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    Default Wallet
                    {walletAddress === "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" && (
                      <span className="text-purple-400 font-mono">✓ Charged</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground mt-1 truncate">0x8734...Ef82</span>
                </button>

                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    walletAddress && walletAddress !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                      ? "border-purple-500 bg-purple-500/10 text-foreground font-semibold"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <span className="font-bold flex items-center justify-between">
                    External Web3 Wallet
                    {walletAddress && walletAddress !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82" && (
                      <span className="text-purple-400 font-mono">✓ Charged</span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
                    {walletAddress && walletAddress !== "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : "Connect Web3 / Mobile Wallet"}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="Custom EVM wallet (0x...)"
                  value={walletAddress ?? ""}
                  onChange={(e) => { setWalletAddress(e.target.value); setWalletVerified(false) }}
                  className="font-mono text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleConnectWallet} className="shrink-0 text-xs">
                  {t("connect_wallet")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ⚡ <strong>Payment & Royalty Authorization</strong>: The selected wallet will be charged <strong>$25.00 USDC</strong> (or <strong>$100.00 USDC</strong> for Fine-Tuned Agents) for on-chain identity minting on <code className="text-foreground font-mono">AgentIdentityRegistry.sol</code> and permanently linked for receiving <strong>10% – 67% Creator Royalties</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-tier">Registration Tier & Fee</Label>
              <select
                id="agent-tier"
                value={agentType === "smart_contract" ? "fine_tuned" : "standard"}
                onChange={(e) => setAgentType(e.target.value === "fine_tuned" ? "smart_contract" : "security")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-semibold"
              >
                <option value="standard">Standard Agent Registration — $25.00 USDC</option>
                <option value="fine_tuned">Fine-Tuned Expert Agent — $100.00 USDC</option>
              </select>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-sm text-muted-foreground space-y-1">
              <div className="flex items-center justify-between font-semibold text-purple-300">
                <span>Total Registration Charge:</span>
                <span className="font-mono font-extrabold text-foreground text-base">
                  {agentType === "smart_contract" ? "$100.00 USDC" : "$25.00 USDC"}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                Charged to wallet <code className="text-foreground font-mono">{walletAddress ? `${walletAddress.slice(0, 8)}...` : "Default Wallet"}</code>.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("saving_agent")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Pay $25 USDC & Register Agent
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("your_registered_agents")}</CardTitle>
          <CardDescription>
            {t("agents_available_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading_agents")}
            </div>
          ) : agents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {t("no_agents_registered")}
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="rounded-lg border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">{agent.description || "No description yet."}</div>
                    </div>
                    <Badge variant="secondary">{agent.agent_type}</Badge>
                  </div>
                  {agent.focus_areas ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {agent.focus_areas.split(",").map((focus) => focus.trim()).filter(Boolean).map((focus) => (
                        <Badge key={focus} variant="outline">
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">Reputation: {agent.reputation}</Badge>
                    {agent.onchain_identity_status ? (
                      <Badge variant="outline">Onchain: {agent.onchain_identity_status}</Badge>
                    ) : null}
                      {agent.onchain_registry_address ? (
                        (process.env.NEXT_PUBLIC_AGENT_IDENTITY_EXPLORER ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_AGENT_IDENTITY_EXPLORER.replace(/['"]/g, '').replace(/\/$/, '')}/address/${agent.onchain_registry_address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-primary underline underline-offset-2"
                          >
                            {agent.onchain_registry_address}
                          </a>
                        ) : (
                          <span className="font-mono">{agent.onchain_registry_address}</span>
                        ))
                      ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getExplorerUrl(network: string, address: string) {
  const n = (network || "homestead").toLowerCase()
  switch (n) {
    case "homestead":
    case "mainnet":
      return `https://etherscan.io/address/${address}`
    case "sepolia":
    case "goerli":
      return `https://${n}.etherscan.io/address/${address}`
    case "matic":
    case "polygon":
      return `https://polygonscan.com/address/${address}`
    case "mumbai":
      return `https://mumbai.polygonscan.com/address/${address}`
    default:
      return `https://etherscan.io/address/${address}`
  }
}
