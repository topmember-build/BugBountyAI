"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Play, Award, CheckCircle2, Zap, Clock, Loader2, Sparkles, AlertTriangle } from "lucide-react"

export function BenchmarkResultModal({
  open,
  onOpenChange,
  challenge,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  challenge: any
}) {
  const [selectedAgent, setSelectedAgent] = useState("Sentinel-V4 Security Agent")
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleRunBenchmark = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/playground/ctf/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.id,
          agent_name: selectedAgent,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setResult(data.benchmark)
      }
    } catch (err) {
      console.error("Benchmark execution failed:", err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-card/95 border-border backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Award className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl">AI Agent CTF Benchmark</DialogTitle>
          </div>
          <DialogDescription>
            Test an AI agent against <span className="text-foreground font-semibold">{challenge.title}</span> to compute accuracy scorecards and generate verified certificates.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="agent-select">Select AI Agent to Benchmark</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agent-select" className="bg-background/60">
                  <SelectValue placeholder="Select Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sentinel-V4 Security Agent">Sentinel-V4 Security Agent (Security Specialty)</SelectItem>
                  <SelectItem value="LogicAudit AI Swarm">LogicAudit AI Swarm (Logic Specialty)</SelectItem>
                  <SelectItem value="ContractVanguard Agent">ContractVanguard Agent (Smart Contract Specialty)</SelectItem>
                  <SelectItem value="Dependa Guard">Dependa Guard (Dependency Specialty)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-background/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Target Scenario:</span>
                <Badge variant="outline" className="text-[10px]">{challenge.difficulty}</Badge>
              </div>
              <p className="font-mono text-muted-foreground">{challenge.target_contract}</p>
              <p className="text-muted-foreground">{challenge.description}</p>
            </div>

            <Button
              onClick={handleRunBenchmark}
              disabled={running}
              className="w-full gap-2 font-bold shadow-lg shadow-primary/20"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing Contract Code...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Run Benchmark Execution</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Score Banner */}
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center space-y-2 relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Benchmark Certified: Grade {result.grade}</span>
              </div>

              <p className="text-4xl font-black text-foreground tracking-tight">
                {result.detection_rate}% <span className="text-base font-normal text-muted-foreground">Accuracy</span>
              </p>

              <p className="text-xs text-muted-foreground font-mono">
                Certificate ID: <span className="text-foreground font-bold">{result.certificate_id}</span>
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl border border-border bg-background/40 space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Precision</p>
                <p className="text-lg font-bold text-foreground">{result.precision_score}%</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-background/40 space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">False Positives</p>
                <p className="text-lg font-bold text-emerald-400">{result.false_positives}</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-background/40 space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Analysis Time</p>
                <p className="text-lg font-bold text-purple-400">{result.duration_seconds}s</p>
              </div>
            </div>

            {/* Discovered Vulnerabilities */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">Discovered Vulnerabilities Log:</p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {result.discovered_vulnerabilities.map((v: any) => (
                  <div key={v.id} className="p-2.5 rounded-lg border border-border/60 bg-background/30 flex items-center justify-between text-xs">
                    <span className="font-semibold">{v.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase border-red-500/30 text-red-400">
                      {v.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Verified on Arc Testnet Sandbox
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResult(null)}
                className="text-xs"
              >
                Benchmark Another Agent
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
