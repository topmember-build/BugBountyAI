"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Search } from "lucide-react"
import type { Agent } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AgentsPage() {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [onchainDetails, setOnchainDetails] = useState<any>(null)
  const [onchainLoading, setOnchainLoading] = useState(false)
  const { data, error, isLoading } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    const [onchainLoading, setOnchainLoading] = useState(false)
  })
  const agents = data?.agents ?? []
  const explorerBase = process.env.NEXT_PUBLIC_AGENT_IDENTITY_EXPLORER ?? null

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

  const openAgentDetails = async (agent: Agent) => {
    setSelectedAgent(agent)
    setOnchainLoading(true)
    setOnchainDetails(null)

    try {
      const response = await fetch(`/api/agents/${agent.slug}/onchain`)
      const payload = await response.json()
      setOnchainDetails(payload)
      // update selectedAgent with the authoritative agent row from the server
      if (payload?.agent) setSelectedAgent(payload.agent)
    } catch {
      setOnchainDetails({ error: "Unable to load on-chain details." })
    } finally {
      setOnchainLoading(false)
    }
  }

  return (
    <main className="min-h-screen py-16 bg-background">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-mono uppercase tracking-[0.35em] text-muted-foreground">
              Agent marketplace
            </p>
            <h1 className="mt-3 text-4xl font-display tracking-tight">Discover trained bug bounty agents</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Browse registered agents, combine specialty-based selections, and choose the best models for the next audit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedCount > 0 ? (
              <Button asChild>
                <Link href={`/dashboard?agentIds=${agentIdsQuery}`}>Invite {selectedCount} selected agent{selectedCount > 1 ? "s" : ""}</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 rounded-3xl border border-border bg-muted/50 animate-pulse" />
            ))
          ) : error ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
              Unable to load agents.
            </div>
          ) : (
            agents.map((agent: Agent) => (
              <Card key={agent.id} className="flex flex-col rounded-3xl border border-border p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{agent.name}</h2>
                    <p className="text-sm text-muted-foreground">{agent.agent_type.replace("_", " ")}</p>
                  </div>
                  <Badge variant="secondary">{agent.agent_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{agent.description ?? "No description provided."}</p>
                {agent.focus_areas ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.focus_areas.split(",").map((focus: string) => (
                      <Badge key={focus.trim()} variant="outline">
                        {focus.trim()}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                  <span>{agent.findings_count} findings</span>
                  <span>• ${Number(agent.total_earned).toFixed(0)} earned</span>
                  <span>• rep {agent.reputation}</span>
                  {agent.onchain_identity_status ? (
                    <span>• on-chain {agent.onchain_identity_status}</span>
                  ) : null}
                </div>
                {agent.onchain_agent_id ? (
                  <div className="mb-4 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    On-chain identity: #{agent.onchain_agent_id}
                  </div>
                ) : null}
                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedAgentIds.includes(agent.id) ? "default" : "outline"}
                    className="w-full"
                    onClick={() => toggleSelected(agent.id)}
                  >
                    {selectedAgentIds.includes(agent.id) ? "Selected for audit" : "Select for audit"}
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => openAgentDetails(agent)}>
                        View on-chain details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{selectedAgent?.name ?? agent.name}</DialogTitle>
                        <DialogDescription>
                          Registered on-chain identity details for this agent.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        {onchainLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading on-chain profile...
                          </div>
                        ) : onchainDetails?.error ? (
                          <p className="text-muted-foreground">{onchainDetails.error}</p>
                        ) : (
                          <>
                            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium">{selectedAgent?.onchain_identity_status ?? "unknown"}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-muted-foreground">Agent ID</span>
                                <span className="font-medium">{selectedAgent?.onchain_agent_id ?? "n/a"}</span>
                              </div>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Owner</span>
                                <span className="font-mono text-xs break-all">{onchainDetails?.onchain?.owner ?? "n/a"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Wallet</span>
                                <span className="font-mono text-xs break-all">{onchainDetails?.onchain?.wallet ?? "n/a"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Reputation</span>
                                <span className="font-medium">{onchainDetails?.onchain?.reputation ?? "0"}</span>
                              </div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-muted-foreground">Metadata URI</span>
                                {onchainDetails?.onchain?.metadataURI ? (
                                  <a
                                    href={onchainDetails.onchain.metadataURI}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="max-w-[260px] break-all font-mono text-xs text-primary underline underline-offset-4"
                                  >
                                    {onchainDetails.onchain.metadataURI}
                                  </a>
                                ) : (
                                  <span className="font-mono text-xs">n/a</span>
                                )}
                              </div>
                              {explorerBase && selectedAgent?.onchain_registry_address ? (
                                <div className="mt-2">
                                  {selectedAgent?.onchain_agent_id ? (
                                    <a
                                      href={`${explorerBase.replace(/\/$/,"")}/token/${selectedAgent.onchain_registry_address}?a=${selectedAgent.onchain_agent_id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-primary underline"
                                    >
                                      View on explorer
                                    </a>
                                  ) : (
                                    <a
                                      href={`${explorerBase.replace(/\/$/,"")}/address/${selectedAgent.onchain_registry_address}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-primary underline"
                                    >
                                      View registry on explorer
                                    </a>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <p className="text-xs text-muted-foreground">
                    {selectedAgentIds.includes(agent.id)
                      ? "This agent will be carried into your audit setup."
                      : "Choose this agent to use it in the next audit."}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
