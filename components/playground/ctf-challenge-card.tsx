"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { BenchmarkResultModal } from "./benchmark-result-modal"
import { ShieldAlert, Code, Play, CheckCircle2, ChevronRight, Cpu } from "lucide-react"

export interface CTFChallenge {
  id: string
  slug: string
  title: string
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert" | string
  category: string
  description: string
  vulnerabilities_count: number
  target_contract: string
  solidity_code: string
  expected_findings: { id: string; title: string; severity: string }[]
}

export function CTFChallengeCard({ challenge }: { challenge: CTFChallenge }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const diffColor =
    challenge.difficulty === "Beginner"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : challenge.difficulty === "Intermediate"
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : challenge.difficulty === "Advanced"
          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
          : "bg-red-500/15 text-red-400 border-red-500/30"

  return (
    <>
      <Card className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase ${diffColor}`}>
              {challenge.difficulty}
            </Badge>

            <Badge variant="secondary" className="bg-background/80 text-[11px] font-mono gap-1 border border-border">
              <ShieldAlert className="h-3 w-3 text-amber-400" />
              {challenge.vulnerabilities_count} Hidden Bugs
            </Badge>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {challenge.title}
            </h3>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 font-mono">
              <Code className="h-3.5 w-3.5 text-primary" />
              <span>{challenge.target_contract}</span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {challenge.description}
          </p>

          {/* Toggle Code Snippet */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <span>{showCode ? "Hide Contract Code" : "Inspect Vulnerable Code"}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showCode ? "rotate-90" : ""}`} />
            </button>

            {showCode && (
              <pre className="rounded-xl border border-border/60 bg-background/80 p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-48 leading-relaxed">
                <code>{challenge.solidity_code}</code>
              </pre>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t border-border/40">
          <div className="flex items-center justify-between w-full gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span>Sandbox Verified</span>
            </span>

            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="rounded-full gap-1.5 font-semibold shadow-sm"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Benchmark My Agent
            </Button>
          </div>
        </CardFooter>
      </Card>

      <BenchmarkResultModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        challenge={challenge}
      />
    </>
  )
}
