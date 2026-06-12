"use client"

import { useEffect } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, FileCode, GitBranch } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Finding {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  confidence: number
  category: string | null
  file_path: string | null
  line_start: number | null
  line_end: number | null
  description: string | null
  recommendation: string | null
  reward_amount: number
  reward_status: "pending" | "settling" | "settled" | "failed"
  agents: { name: string; agent_type: string } | null
}

interface Audit {
  id: string
  repo_url: string
  repo_name: string | null
  branch: string
  status: string
  findings_count: number
  total_reward: number
}

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  low: "bg-primary/15 text-primary border-primary/30",
  info: "bg-muted text-muted-foreground border-border",
}

const rewardStyles: Record<string, string> = {
  settled: "bg-primary/15 text-primary border-primary/30",
  settling: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
}

export function AuditDetail({ auditId }: { auditId: string }) {
  const { data, isLoading, mutate } = useSWR<{ audit: Audit; findings: Finding[] }>(
    `/api/audits/${auditId}`,
    fetcher,
  )

  const hasSettling = data?.findings?.some((f) => f.reward_status === "settling") ?? false

  // While rewards are settling on-chain, reconcile with Circle and refresh.
  useEffect(() => {
    if (!hasSettling) return
    let cancelled = false

    const reconcile = async () => {
      try {
        const res = await fetch("/api/rewards/reconcile", { method: "POST" })
        const json = await res.json()
        if (!cancelled && json.reconciled > 0) mutate()
      } catch {
        // Transient errors are fine; the interval retries.
      }
    }

    reconcile()
    const interval = setInterval(reconcile, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [hasSettling, mutate])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!data?.audit) {
    return (
      <div className="text-center text-muted-foreground py-20">
        Audit not found.{" "}
        <Link href="/dashboard" className="text-primary underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { audit, findings } = data

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display tracking-tight">
              {audit.repo_name ?? audit.repo_url.replace(/^https?:\/\//, "")}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="inline-flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {audit.branch}
              </span>
              <span>{audit.findings_count} findings</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display text-primary">
              ${Number(audit.total_reward).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">USDC rewarded</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {findings.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
            No findings recorded for this audit.
          </div>
        ) : (
          findings.map((f) => (
            <article key={f.id} className="border border-border rounded-xl bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={severityStyles[f.severity]}>
                    {f.severity}
                  </Badge>
                  {f.category && (
                    <span className="text-xs text-muted-foreground">{f.category}</span>
                  )}
                  {f.agents && (
                    <span className="text-xs text-muted-foreground">· {f.agents.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    ${Number(f.reward_amount).toFixed(2)}
                  </span>
                  <Badge variant="outline" className={rewardStyles[f.reward_status]}>
                    {f.reward_status}
                  </Badge>
                </div>
              </div>

              <h3 className="font-medium mb-2">{f.title}</h3>

              {f.file_path && (
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground mb-3">
                  <FileCode className="w-3.5 h-3.5" />
                  {f.file_path}
                  {f.line_start ? `:${f.line_start}` : ""}
                  {f.line_end && f.line_end !== f.line_start ? `-${f.line_end}` : ""}
                </div>
              )}

              {f.description && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {f.description}
                </p>
              )}

              {f.recommendation && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="font-medium">Recommendation: </span>
                  <span className="text-muted-foreground">{f.recommendation}</span>
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                Confidence {(Number(f.confidence) * 100).toFixed(0)}%
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
