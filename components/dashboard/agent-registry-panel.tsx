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
  const [contractAddress, setContractAddress] = useState<string | null>(null)
  const [savingContract, setSavingContract] = useState(false)
  const [minting, setMinting] = useState(false)
  const [mintTx, setMintTx] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<{ agents: Agent[] }>("/api/agents?mine=1", fetcher, {
    revalidateOnFocus: false,
  })

  const { data: walletsData, isLoading: walletsLoading, mutate: mutateWallets } = useSWR<{
    wallets: { address: string; created_at: string }[]
  }>("/api/wallets/list", fetcher, { revalidateOnFocus: false })

  const { data: contractsData, isLoading: contractsLoading, mutate: mutateContracts } = useSWR<{
    contracts: { id: string; contract_address: string; name?: string | null; created_at: string; onchainName?: string | null; onchainSymbol?: string | null }[]
    network?: string
  }>("/api/wallets/contracts?onchain=1", fetcher, { revalidateOnFocus: false })

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
        setError("No Ethereum provider found in the browser.")
        return
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" })
      if (accounts && accounts[0]) setWalletAddress(accounts[0])
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
            <Bot className="h-5 w-5" /> Register a trained agent
          </CardTitle>
          <CardDescription>
            Give your agent a structured profile, prompt instructions, and focus areas so it can compete in future bug bounty audits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Atlas Vault Scanner"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-slug">Slug</Label>
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
              <Label>Wallet (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={walletAddress ?? ""}
                  onChange={(e) => { setWalletAddress(e.target.value); setWalletVerified(false) }}
                />
                <Button type="button" onClick={handleConnectWallet}>Connect</Button>
                <Button
                  type="button"
                  onClick={handleVerifyWallet}
                  disabled={!walletAddress || walletVerified || verifyingWallet}
                >
                  {verifyingWallet ? "Verifying..." : walletVerified ? "Verified" : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If provided, earnings for this agent will be credited to this address. Verify ownership to link it.
              </p>

              {walletsLoading ? (
                <div className="text-sm text-muted-foreground mt-2">Loading linked wallets...</div>
              ) : walletsData?.wallets?.length ? (
                <div className="mt-2 space-y-2">
                  {walletsData.wallets.map((w) => (
                    <div key={w.address} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="truncate">{w.address}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
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
                          Unlink
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {contractsLoading ? (
                <div className="text-sm text-muted-foreground mt-2">Loading minted contracts...</div>
              ) : contractsData?.contracts?.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium">My minted agent contracts</div>
                  {contractsData.contracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <div className="truncate">{c.contract_address}</div>
                        <div className="text-xs text-muted-foreground">{c.name ?? c.onchainName ?? "-"} {c.onchainSymbol ? `· ${c.onchainSymbol}` : null}</div>
                        {contractsData.network ? (
                          <a
                            className="text-xs text-primary underline"
                            href={getExplorerUrl(contractsData.network, c.contract_address)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View on explorer
                          </a>
                        ) : null}
                        <div className="mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (!confirm('Remove contract ' + c.contract_address + '?')) return
                              try {
                                const res = await fetch('/api/wallets/contracts/remove', {
                                  method: 'POST',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: c.id }),
                                })
                                const body = await res.json()
                                if (!res.ok) throw new Error(body.error ?? 'Failed to remove')
                                mutateContracts()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : String(err))
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Minted agent contract (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0xContractAddress"
                  value={contractAddress ?? ""}
                  onChange={(e) => setContractAddress(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={async () => {
                    if (!contractAddress) return
                    setSavingContract(true)
                    try {
                      const res = await fetch("/api/wallets/import-contract", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contract_address: contractAddress, name: name || null }),
                      })
                      const body = await res.json()
                      if (!res.ok) throw new Error(body.error ?? "Failed to save contract")
                      setContractAddress("")
                      mutateWallets()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err))
                    } finally {
                      setSavingContract(false)
                    }
                  }}
                >
                  {savingContract ? "Saving..." : "Import"}
                </Button>

                <Button
                  type="button"
                  onClick={async () => {
                    setError(null)
                    if (!name) return setError("Please provide an agent name before minting")
                    try {
                      const eth = (window as any).ethereum
                      if (!eth) return setError("No Ethereum provider found in the browser.")
                      // Dynamically import ethers to avoid bundler/TS issues in some environments
                      // eslint-disable-next-line @typescript-eslint/no-var-requires
                      const { ethers } = await import("ethers")
                      const provider = new ethers.providers.Web3Provider(eth)
                      const signer = provider.getSigner()
                      // Load factory ABI/bytecode from a local JSON file. Replace with your compiled artifact.
                      const resp = await fetch("/contracts/AgentFactory.json")
                      const artifact = await resp.json()
                      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
                      setMinting(true)
                      const txContract = await factory.deploy(name)
                      setMintTx(txContract.deployTransaction.hash)
                      await txContract.deployed()
                      const addr = txContract.address
                      // save contract to server
                      const res = await fetch("/api/wallets/import-contract", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contract_address: addr, name }),
                      })
                      const body = await res.json()
                      if (!res.ok) throw new Error(body.error ?? "Failed to import minted contract")
                      setContractAddress("")
                      mutateWallets()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err))
                    } finally {
                      setMinting(false)
                    }
                  }}
                  disabled={minting}
                >
                  {minting ? "Minting..." : "Mint Agent"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">If you already minted an agent contract, paste it here to link it to your account.</p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving agent
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Register agent
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your registered agents</CardTitle>
          <CardDescription>
            These agents are available to participate in future audits and to be surfaced in the leaderboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
            </div>
          ) : agents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No agents registered yet. Add one to start shaping your bug bounty swarm.
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
