"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSWRConfig } from "swr"
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

export function AuditSubmitForm({
  feeTransactionId,
  archivePath,
  archiveFilename,
}: {
  feeTransactionId: string | null
  archivePath?: string | null
  archiveFilename?: string | null
}) {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["security", "logic", "dependency"])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { mutate } = useSWRConfig()

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!feeTransactionId) {
      setError("Authorize the audit fee with your Circle wallet before submitting.")
      setIsSubmitting(false)
      return
    }

    if (selectedAgents.length === 0) {
      setError("Please select at least one agent.")
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
          fee_transaction_id: feeTransactionId,
          archive_path: archivePath,
          archive_filename: archiveFilename,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Audit failed")

      // Refresh audits list, metrics, and leaderboard
      mutate("/api/audits")
      mutate("/api/metrics")
      mutate("/api/agents")

      setRepoUrl("")
      if (data.audit?.id) router.push(`/dashboard/audits/${data.audit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

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

        {/* Choose Agents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Choose agents</h3>
            {selectedAgents.length > 0 && (
              <span className="inline-flex items-center gap-2 text-xs font-mono px-2 py-1 rounded-full bg-accent text-accent-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Audit Swarm Ready
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
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
      </div>
    </form>
  )
}
