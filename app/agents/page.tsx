"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import type { Agent } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AgentsPage() {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const { data, error, isLoading } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 20000,
  })
  const agents = data?.agents ?? []

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
              <Card key={agent.id} className="rounded-3xl border border-border p-6">
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
                </div>
                <Button
                  type="button"
                  size="sm"
                  className={`w-full ${selectedAgentIds.includes(agent.id) ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => toggleSelected(agent.id)}
                >
                  {selectedAgentIds.includes(agent.id) ? "Selected" : "Select for audit"}
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
