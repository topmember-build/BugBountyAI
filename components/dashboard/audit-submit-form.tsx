"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSWRConfig } from "swr"
import useSWR from "swr"
import type { Agent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, GitBranch, Package, FileCode2, Check } from "lucide-react"

const selectableAgents = [
  { id: "security", name: "Security Agent", icon: ShieldCheck },
  { id: "logic", name: "Logic Agent", icon: GitBranch },
  { id: "dependency", name: "Dependency Agent", icon: Package },
  { id: "smart_contract", name: "Smart Contract Agent", icon: FileCode2 },
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AuditSubmitForm({
  feeTransactionId,
  archivePath,
  archiveFilename,
  initialSelectedAgentIds = [],
}: {
  feeTransactionId: string | null
  archivePath?: string | null
  archiveFilename?: string | null
  initialSelectedAgentIds?: string[]
}) {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (initialSelectedAgentIds.length > 0) {
      setSelectedAgentIds(Array.from(new Set(initialSelectedAgentIds)))
    }
  }, [initialSelectedAgentIds])

  const { data: registeredData, isLoading: registeredLoading } = useSWR<{ agents: Agent[] }>(
    "/api/agents?mine=1",
    fetcher,
    { revalidateOnFocus: false },
  )
  const { data: publicAgentsData, isLoading: publicAgentsLoading } = useSWR<{ agents: Agent[] }>(
    "/api/agents",
    fetcher,
    { revalidateOnFocus: false },
  )

  const registeredAgents = registeredData?.agents ?? []
  const publicAgents = publicAgentsData?.agents ?? []

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    if (!feeTransactionId) {
      setError("Authorize the audit fee with your Circle wallet before submitting.")
      setIsSubmitting(false)
      return
    }

    if (selectedAgentIds.length === 0 && selectedAgents.length === 0) {
      setError("Please select at least one agent or agent specialty.")
      setIsSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_url: repoUrl.trim(),
          branch: branch.trim() || "main",
          agents: selectedAgents,
          agent_ids: selectedAgentIds,
          fee_transaction_id: feeTransactionId,
          archive_path: archivePath,
          archive_filename: archiveFilename,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error ?? "Audit failed"
        if (message.toLowerCase().includes("refund") || message.toLowerCase().includes("refunded")) {
          setSuccessMessage(message)
        } else {
          throw new Error(message)
        }
        return
      }

      // Refresh audits list, metrics, wallet state, and leaderboard
      await Promise.all([
        mutate("/api/audits"),
        mutate("/api/metrics"),
        mutate("/api/agents"),
        mutate("/api/wallet"),
      ])

      setRepoUrl("")
      if (data.audit?.id) router.push(`/dashboard/audits/${data.audit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleAgents = React.useMemo(() => {
    const agentMap = new Map<string, Agent>()

    registeredAgents.forEach((agent) => agentMap.set(agent.id, agent))
    publicAgents.forEach((agent) => {
      if (!agentMap.has(agent.id)) {
        agentMap.set(agent.id, agent)
      }
    })

    const selectedExtraAgents = selectedAgentIds
      .map((id) => publicAgents.find((agent) => agent.id === id) ?? registeredAgents.find((agent) => agent.id === id))
      .filter((agent): agent is Agent => Boolean(agent))

    selectedExtraAgents.forEach((agent) => {
      if (!agentMap.has(agent.id)) {
        agentMap.set(agent.id, agent)
      }
    })

    return Array.from(agentMap.values())
  }, [publicAgents, registeredAgents, selectedAgentIds])

  const isAgentSelectionLoading = registeredLoading || (selectedAgentIds.length > 0 && publicAgentsLoading)

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border rounded-xl bg-card p-6 lg:p-8"
    >
      <div className="space-y-6">
        {/* Repository and Branch */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid gap-2">
            <Label htmlFor="repo_url">Repository URL</Label>
            <Input
              id="repo_url"
              type="url"
              required
              placeholder="https://github.com/org/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <div className="w-full md:w-40 grid gap-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Need more agents?</h3>
              <p className="text-xs text-muted-foreground">
                Browse the marketplace and bring trained agents into your audit setup.
              </p>
            </div>
            <Button type="button" variant="default" size="sm" asChild>
              <Link href="/agents">Browse agent marketplace</Link>
            </Button>
          </div>
        </div>

        {/* Use registered agents */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-sm">Use trained agents</h3>
            {selectedAgentIds.length > 0 ? (
              <span className="inline-flex w-fit items-center gap-2 text-xs font-mono px-2 py-1 rounded-full bg-primary text-primary-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Using registered agents
              </span>
            ) : null}
          </div>
          {isAgentSelectionLoading ? (
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Loading your agents...
            </div>
          ) : visibleAgents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No selected trained agents available. Choose agents from the marketplace or register one.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleAgents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id)
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() =>
                      setSelectedAgentIds((prev) =>
                        prev.includes(agent.id) ? prev.filter((id) => id !== agent.id) : [...prev, agent.id],
                      )
                    }
                    className={`flex w-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {agent.agent_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{agent.description ?? "No description."}</p>
                    {isSelected && <span className="text-xs font-medium text-primary">Selected</span>}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Selecting trained agents will use their custom guidance; otherwise you can choose specialties below.
            </p>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/agents">Browse agent marketplace</a>
            </Button>
          </div>
        </div>

        {/* Choose Agents */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-sm">Choose agent specialties</h3>
            {selectedAgents.length > 0 && selectedAgentIds.length === 0 ? (
              <span className="inline-flex w-fit items-center gap-2 text-xs font-mono px-2 py-1 rounded-full bg-accent text-accent-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Audit Swarm Ready
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectableAgents.map((agent) => {
              const Icon = agent.icon
              const isSelected = selectedAgents.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-300 ${
                    isSelected
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{agent.name}</span>
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit Section */}
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting || selectedAgents.length === 0}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Request audit"}
          </Button>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {successMessage ? <div className="text-sm text-emerald-600">{successMessage}</div> : null}
      </div>
    </form>
  )
}
