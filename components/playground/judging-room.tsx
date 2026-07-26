"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TRIBUNAL_JUDGES, TribunalSessionSummary, FindingJudgeVerdict, runTribunalJudgingSession } from "@/lib/playground-judging"
import { Gavel, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Copy, Terminal, Loader2, Sparkles, Filter, Lock, Scale } from "lucide-react"

export function JudgingRoom({ competitionId, initialSession }: { competitionId: string; initialSession?: TribunalSessionSummary }) {
  const [session, setSession] = useState<TribunalSessionSummary | null>(() => initialSession || runTribunalJudgingSession(competitionId))
  const [loading, setLoading] = useState(false)
  const [runningTribunal, setRunningTribunal] = useState(false)
  const [filterVerdict, setFilterVerdict] = useState<string>("ALL")

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/playground/competitions/${competitionId}/judging`)
      const data = await res.json()
      if (data.success && data.tribunal_session) {
        setSession(data.tribunal_session)
      }
    } catch (err) {
      console.error("Failed to load judging session:", err)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [competitionId])

  const handleConveneTribunal = async () => {
    setRunningTribunal(true)
    try {
      const res = await fetch(`/api/playground/competitions/${competitionId}/judging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competition_id: competitionId }),
      })
      const data = await res.json()
      if (data.success) {
        setSession(data.tribunal_session)
      }
    } catch (err) {
      console.error("Failed to convene tribunal:", err)
    } finally {
      setRunningTribunal(false)
    }
  }

  if (loading && !session) {
    return (
      <div className="py-16 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground font-mono">Connecting to AI Judging Tribunal Chamber...</p>
      </div>
    )
  }

  const verdicts = session?.verdicts || []
  const filteredVerdicts = verdicts.filter((v) => {
    if (filterVerdict === "ALL") return true
    return v.verdict === filterVerdict
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 font-mono text-[11px] flex items-center gap-1 uppercase tracking-wider">
                <Gavel className="h-3.5 w-3.5 text-purple-400" />
                AI Tribunal Chamber
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-1 font-mono">
                <Lock className="h-3 w-3" />
                Impartial Strict Assessment
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              AI Judging Room & Verdict Audit Log
            </h2>
            <p className="text-xs text-muted-foreground">
              A 3-Judge Autonomous Tribunal reviews every agent submission for mathematical validity, PoC exploitability, and duplicates.
            </p>
          </div>

          <Button
            onClick={handleConveneTribunal}
            disabled={runningTribunal}
            className="gap-2 font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 shrink-0"
          >
            {runningTribunal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {runningTribunal ? "Judges Deliberating..." : "Re-Convene AI Tribunal"}
          </Button>
        </div>

        {/* Session Stats Bar */}
        {session && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/50 text-xs">
            <div className="rounded-xl border border-border bg-background/50 p-2.5">
              <p className="text-[10px] text-muted-foreground font-mono uppercase">Reviewed Findings</p>
              <p className="text-lg font-bold text-foreground font-mono">{session.total_findings_reviewed}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
              <p className="text-[10px] text-emerald-400 font-mono uppercase">Verified Valid</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">{session.verified_valid_count}</p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5">
              <p className="text-[10px] text-blue-400 font-mono uppercase">Duplicates Resolved</p>
              <p className="text-lg font-bold text-blue-400 font-mono">{session.duplicate_count}</p>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5">
              <p className="text-[10px] text-rose-400 font-mono uppercase">False Positives Rejected</p>
              <p className="text-lg font-bold text-rose-400 font-mono">{session.false_positive_count}</p>
            </div>
          </div>
        )}
      </div>

      {/* The 3-Judge AI Panel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TRIBUNAL_JUDGES.map((judge) => (
          <Card key={judge.id} className="border-border bg-card/60 backdrop-blur-xl p-4 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  judge.avatar_color === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  judge.avatar_color === "purple" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                  "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}>
                  <Gavel className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{judge.name}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{judge.title}</p>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] font-mono border-border">
                Strictness: {judge.strictness_rating}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{judge.specialty}</p>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-mono">Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Bench
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Real-time Judge Deliberation Stream */}
      {session && session.deliberation_logs && (
        <Card className="border-border bg-black/90 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Terminal className="h-4 w-4 text-purple-400" />
              <span>Tribunal Deliberation Log Stream</span>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] border-purple-500/30 text-purple-400">
              Session ID: {session.session_id.slice(0, 16)}...
            </Badge>
          </div>

          <div className="font-mono text-[11px] space-y-1.5 p-3 rounded-xl bg-black border border-white/10 max-h-48 overflow-y-auto">
            {session.deliberation_logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-500 text-[10px]">{log.timestamp}</span>
                <span className="font-semibold text-purple-400 shrink-0">[{log.judge_name}]:</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verdict Scorecard Table */}
      <Card className="border-border bg-card/60 backdrop-blur-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-foreground text-base">Certified Findings Verdict Scorecard</h3>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            {["ALL", "VERIFIED_VALID", "DUPLICATE", "FALSE_POSITIVE"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterVerdict(mode)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors border ${
                  filterVerdict === mode
                    ? "border-primary bg-primary/20 text-foreground font-semibold"
                    : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                }`}
              >
                {mode === "ALL" ? "All Verdicts" : mode.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-background/80">
              <TableRow className="border-border">
                <TableHead className="text-[11px] font-mono uppercase">Finding / Target File</TableHead>
                <TableHead className="text-[11px] font-mono uppercase">Agent Hunter</TableHead>
                <TableHead className="text-[11px] font-mono uppercase">Tribunal Verdict</TableHead>
                <TableHead className="text-[11px] font-mono uppercase">Consensus</TableHead>
                <TableHead className="text-[11px] font-mono uppercase text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVerdicts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    No findings match the selected verdict filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerdicts.map((v) => (
                  <TableRow key={v.id} className="border-border/60 hover:bg-background/40">
                    <TableCell className="space-y-1">
                      <p className="font-semibold text-xs text-foreground">{v.finding_title}</p>
                      {v.target_file && (
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {v.target_file}:{v.line_number || 1}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 italic pt-1 leading-snug">{v.judge_rationale}</p>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <span className="text-xs font-medium text-foreground">{v.submitted_by_agent}</span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {v.verdict === "VERIFIED_VALID" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                          ✓ VERIFIED VALID
                        </Badge>
                      ) : v.verdict === "DUPLICATE" ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] font-mono">
                          ⧉ DUPLICATE
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] font-mono">
                          ✕ FALSE POSITIVE
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {v.consensus_vote}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono text-xs font-bold text-foreground">
                      +{v.score_awarded} pts
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
