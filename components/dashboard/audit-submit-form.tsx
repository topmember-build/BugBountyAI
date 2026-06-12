"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSWRConfig } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck } from "lucide-react"

export function AuditSubmitForm() {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { mutate } = useSWRConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl.trim(), branch: branch.trim() || "main" }),
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
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
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
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11 px-6 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Run audit
            </>
          )}
        </Button>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {isSubmitting && (
        <p className="mt-4 text-sm text-muted-foreground">
          The agent swarm is analyzing your code. This can take up to a minute.
        </p>
      )}
    </form>
  )
}
