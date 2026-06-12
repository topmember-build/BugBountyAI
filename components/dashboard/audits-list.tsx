"use client"

import useSWR from "swr"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight, GitBranch } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Audit {
  id: string
  repo_url: string
  repo_name: string | null
  branch: string
  status: "queued" | "scanning" | "completed" | "failed"
  findings_count: number
  total_reward: number
  created_at: string
}

const statusStyles: Record<string, string> = {
  completed: "bg-primary/15 text-primary border-primary/30",
  scanning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  queued: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
}

export function AuditsList() {
  const { data, isLoading } = useSWR<{ audits: Audit[] }>("/api/audits", fetcher, {
    refreshInterval: 10000,
  })

  return (
    <section>
      <h2 className="text-xl font-display tracking-tight mb-4">Your audits</h2>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.audits?.length ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
          No audits yet. Submit a repository above to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.audits.map((audit) => (
            <Link
              key={audit.id}
              href={`/dashboard/audits/${audit.id}`}
              className="group border border-border rounded-xl bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {audit.repo_name ?? audit.repo_url.replace(/^https?:\/\//, "")}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      {audit.branch}
                    </span>
                    <span>{audit.findings_count} findings</span>
                    <span className="text-primary font-medium">
                      ${Number(audit.total_reward).toFixed(2)} USDC
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyles[audit.status]}>
                  {audit.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
