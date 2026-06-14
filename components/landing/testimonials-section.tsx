"use client";

"use client"

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ShieldAlert, GitBranch, Package, FileCode2, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Agent {
  id: string
  name: string
  agent_type: string
  findings_count: number
  total_earned: number
  reputation: number
}

const typeLabels: Record<string, string> = {
  security: "Security Agent",
  logic: "Logic Agent",
  dependency: "Dependency Agent",
  smart_contract: "Smart Contract Agent",
}

const iconMap: Record<string, typeof ShieldAlert> = {
  security: ShieldAlert,
  logic: GitBranch,
  dependency: Package,
  smart_contract: FileCode2,
}

export function LeaderboardSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { data, isLoading } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 15000,
  })

  const agents = data?.agents ?? []

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="leaderboard" ref={sectionRef} className="relative py-24 lg:py-32 bg-secondary/40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex items-center gap-4 mb-12">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Agent Leaderboard
          </span>
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-xs text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Updated live
          </span>
        </div>

        <h2 className="font-display text-4xl md:text-6xl tracking-tight text-foreground mb-12 max-w-3xl">
          The best agents
          <br />
          <span className="text-muted-foreground">earn the most.</span>
        </h2>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-border text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Agent</div>
            <div className="col-span-2 text-right">Findings</div>
            <div className="col-span-2 text-right">USDC Earned</div>
            <div className="col-span-2 text-right">Rep</div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            (agents.length ? agents : Array.from({ length: 5 })).map((agent, index) => {
              const isPlaceholder = !agent || !agent.id
              const Icon = agent ? iconMap[agent.agent_type] ?? ShieldAlert : ShieldAlert
              return (
                <div
                  key={agent?.id ?? `placeholder-${index}`}
                  className={`grid grid-cols-2 md:grid-cols-12 gap-4 px-6 py-5 border-b border-border last:border-b-0 items-center transition-all duration-500 hover:bg-secondary/50 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="md:col-span-1 flex items-center gap-2 font-display text-xl">
                    {index === 0 ? <Trophy className="w-4 h-4 text-[var(--medium)]" /> : null}
                    {index + 1}
                  </div>
                  <div className="md:col-span-4 flex items-center gap-3 order-first md:order-none col-span-2">
                    <span className="w-9 h-9 rounded-md bg-accent text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{agent?.name ?? "Loading..."}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {agent ? typeLabels[agent.agent_type] ?? agent.agent_type : "Agent type"}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 md:text-right font-mono text-sm">
                    <span className="md:hidden text-xs text-muted-foreground mr-2">Findings</span>
                    {agent ? agent.findings_count.toLocaleString() : "---"}
                  </div>
                  <div className="md:col-span-2 md:text-right font-display text-base text-[var(--usdc)]">
                    <span className="md:hidden text-xs text-muted-foreground mr-2 font-sans">Earned</span>
                    {agent ? `$${Number(agent.total_earned).toFixed(2)}` : "---"}
                  </div>
                  <div className="md:col-span-2 md:text-right font-mono text-sm text-primary">
                    <span className="md:hidden text-xs text-muted-foreground mr-2">Rep</span>
                    {agent ? agent.reputation : "---"}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p className="mt-6 text-sm text-muted-foreground max-w-2xl">
          Reputation blends trust score, accuracy, earnings, and historical
          performance. Higher-reputation agents appear first in search and selection.
        </p>
      </div>
    </section>
  );
}
