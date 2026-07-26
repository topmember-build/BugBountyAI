"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Trophy, ShieldCheck, Clock, Users, ArrowUpRight, Code, ExternalLink, Zap, CheckCircle2, Hourglass, FileCode, FolderArchive, UploadCloud, XCircle } from "lucide-react"

export interface Competition {
  id: string
  slug: string
  title: string
  sponsor_name: string
  sponsor_logo?: string
  description: string
  category: string
  repo_url: string
  branch: string
  prize_pool_usdc: number
  status: "active" | "upcoming" | "completed" | string
  start_date: string
  end_date: string
  escrow_contract_address?: string
  escrow_tx_id?: string
  participants_count?: number
  findings_count?: number
}

export function CompetitionCard({ competition }: { competition: Competition }) {
  const isLive = competition.status === "active"
  const isUpcoming = competition.status === "upcoming"
  const isPending = competition.status === "pending_approval"
  const isDeclined = competition.status === "declined"
  const isInternal = competition.repo_url?.startsWith("internal://")

  const endDate = new Date(competition.end_date)
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 transition-opacity group-hover:opacity-100" />

      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={isLive ? "default" : isUpcoming ? "outline" : "secondary"}
            className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              isLive
                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                : isPending
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : isDeclined
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : isUpcoming
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      : "bg-muted text-muted-foreground"
            }`}
          >
            {isLive ? (
              <>
                <Zap className="h-3 w-3 text-emerald-500 animate-pulse" />
                Live Sprint
              </>
            ) : isPending ? (
              <>
                <Hourglass className="h-3 w-3 text-blue-400 animate-pulse" />
                Pending Review
              </>
            ) : isDeclined ? (
              <>
                <XCircle className="h-3 w-3 text-rose-400" />
                Declined
              </>
            ) : isUpcoming ? (
              <>
                <Clock className="h-3 w-3 text-amber-500" />
                Pre-Reg Open
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                Completed
              </>
            )}
          </Badge>

          <Badge variant="outline" className="rounded-md border-border bg-background/50 text-xs font-normal">
            {competition.category}
          </Badge>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {competition.title}
          </h3>
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span>Hosted by</span>
            <span className="text-foreground font-semibold">{competition.sponsor_name}</span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 py-2">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {competition.description}
        </p>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Prize Pool (Arc USDC)</p>
              <p className="text-lg font-extrabold text-foreground tracking-tight">
                ${competition.prize_pool_usdc.toLocaleString()}{" "}
                <span className="text-xs font-normal text-primary">USDC</span>
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="bg-background/80 text-[11px] font-mono gap-1 border border-border">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Escrow Locked
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/30 px-2.5 py-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>{isLive ? `${daysLeft} days left` : isPending ? "Awaiting Approval" : isDeclined ? "Declined" : isUpcoming ? "Starts soon" : "Ended"}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/30 px-2.5 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{competition.participants_count || 0} Swarms</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/40">
        <div className="flex items-center justify-between w-full gap-2">
          {isInternal ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[160px]">
              {competition.repo_url?.includes("pasted-code") ? (
                <><FileCode className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span className="truncate">Pasted Contract</span></>
              ) : competition.repo_url?.includes("zip-archive") ? (
                <><FolderArchive className="h-3.5 w-3.5 shrink-0 text-purple-400" /><span className="truncate">ZIP Archive</span></>
              ) : (
                <><UploadCloud className="h-3.5 w-3.5 shrink-0 text-blue-400" /><span className="truncate">Uploaded Files</span></>
              )}
            </span>
          ) : (
            <a
              href={competition.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate max-w-[140px]"
            >
              <Code className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Repo Scope</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}

          <Button asChild size="sm" className="rounded-full gap-1.5 font-medium shadow-sm">
            <Link href={`/playground/${competition.id}`}>
              {isPending ? "View Details" : "Enter Arena"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
