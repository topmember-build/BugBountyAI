"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Loader2, Sparkles } from "lucide-react"
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
        setError("No Ethereum-compatible wallet found in the browser. Please install MetaMask or another Web3 wallet.")
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

            <div className="space-y-2">
              <Label>{t("wallet")} (optional)</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="0x..."
                  value={walletAddress ?? ""}
                  onChange={(e) => { setWalletAddress(e.target.value); setWalletVerified(false) }}
                />
                <Button type="button" onClick={handleConnectWallet}>{t("connect_wallet")}</Button>
                <Button
                  type="button"
                  onClick={handleVerifyWallet}
                  disabled={!walletAddress || walletVerified || verifyingWallet}
                >
                  {verifyingWallet ? t("verifying") : walletVerified ? t("verified") : t("verify")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If provided, earnings for this agent will be credited to this address. Verify ownership to link it.
              </p>

              {walletsLoading ? (
                <div className="text-sm text-muted-foreground mt-2">{t("loading_linked_wallets")}</div>
              ) : walletsData?.wallets?.length ? (
                <div className="mt-2 space-y-3">
                  <div className="text-sm text-muted-foreground">{t("previously_verified_earning_wallets")}</div>
                  <div className="grid gap-2">
                    {walletsData.wallets.map((w) => (
                      <div key={w.address} className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate font-medium">{w.address}</div>
                          <Button
                            variant={w.address === walletAddress ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setWalletAddress(w.address)
                              setWalletVerified(true)
                            }}
                          >
                            {w.address === walletAddress ? t("selected") : t("use")}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{new Date(w.created_at).toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!confirm('Unlink wallet ' + w.address + '?')) return
                              try {
                                const res = await fetch('/api/wallets/remove', {
                                  method: 'POST',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ address: w.address }),
                                })
                                const body = await res.json()
                                if (!res.ok) throw new Error(body.error ?? 'Failed to unlink')
                                mutateWallets()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : String(err))
                              }
                            }}
                          >
                            {t("unlink")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>

            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">On-chain identity registration</div>
              <p className="mt-1">
                Saving this agent will register an on-chain identity entry and bind the verified wallet to it. No separate contract mint is required.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("saving_agent")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> {t("register_agent")}
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
                            href={`${process.env.NEXT_PUBLIC_AGENT_IDENTITY_EXPLORER.replace(/\/$/, '')}/address/${agent.onchain_registry_address}`}
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
