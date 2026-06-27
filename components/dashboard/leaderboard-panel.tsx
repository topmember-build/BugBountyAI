"use client"

import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy } from "lucide-react"

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || res.statusText)
  }

  return data
}

interface Agent {
  id: string
  name: string
  agent_type: string
  findings_count: number
  total_earned: number
  reputation: number
}

const typeLabels: Record<string, string> = {
  security: "Security",
  logic: "Logic",
  dependency: "Dependency",
  smart_contract: "Smart Contract",
}

export function LeaderboardPanel() {
  const { data, isLoading } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshWhenOffline: false,
    revalidateIfStale: true,
  })

  return (
    <section className="border border-border rounded-xl bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-display tracking-tight">Agent leaderboard</h2>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.agents?.length ? (
        <ol className="flex flex-col gap-3">
          {data.agents.map((agent, i) => (
            <li key={agent.id} className="flex items-center gap-3">
              <span className="w-6 text-sm font-mono text-muted-foreground">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{agent.name}</div>
                <div className="text-xs text-muted-foreground">
                  {typeLabels[agent.agent_type] ?? agent.agent_type} · {agent.findings_count} findings
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-primary">
                  ${Number(agent.total_earned).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">rep {agent.reputation}</div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No live agent activity yet. Register or update agents to populate the leaderboard.
        </div>
      )}
    </section>
  )
}
