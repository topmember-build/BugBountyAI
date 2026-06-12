"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

type Severity = "Critical" | "High" | "Medium" | "Low";

const rewardTiers: {
  severity: Severity;
  base: string;
  scoreLabel: string;
  description: string;
  accent: string;
}[] = [
  {
    severity: "Critical",
    base: "$0.05",
    scoreLabel: "9.0 – 10.0",
    description: "Remote code execution, fund-draining contract flaws, full auth bypass.",
    accent: "var(--critical)",
  },
  {
    severity: "High",
    base: "$0.02",
    scoreLabel: "7.0 – 8.9",
    description: "Privilege escalation, sensitive data exposure, broken access control.",
    accent: "var(--high)",
  },
  {
    severity: "Medium",
    base: "$0.01",
    scoreLabel: "4.0 – 6.9",
    description: "Logic errors, misconfigurations, and validation gaps.",
    accent: "var(--medium)",
  },
  {
    severity: "Low",
    base: "$0.001",
    scoreLabel: "0.1 – 3.9",
    description: "Minor issues, outdated dependencies, informational hardening.",
    accent: "var(--low)",
  },
];

const severityBase: Record<Severity, number> = {
  Critical: 0.05,
  High: 0.02,
  Medium: 0.01,
  Low: 0.001,
};

export function RewardsEngineSection() {
  const [severity, setSeverity] = useState<Severity>("Critical");
  const [confidence, setConfidence] = useState(92);

  const reward = severityBase[severity] * (confidence / 100);

  return (
    <section id="rewards" className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-16">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Rewards Engine
          </span>
          <h2 className="font-display text-4xl md:text-6xl tracking-tight text-foreground mb-6">
            Better findings.
            <br />
            <span className="text-muted-foreground">Bigger rewards.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            Every validated finding is priced by severity and confidence, then paid
            automatically in USDC. No invoices, no waiting.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Reward tiers */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
            {rewardTiers.map((tier) => (
              <div key={tier.severity} className="bg-card p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: tier.accent }} />
                  <span className="font-display text-2xl">{tier.severity}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display text-4xl text-[var(--usdc)]">{tier.base}</span>
                  <span className="text-sm text-muted-foreground">/ finding</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground mb-4">
                  Severity score {tier.scoreLabel}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
              </div>
            ))}
          </div>

          {/* Interactive calculator */}
          <div className="bg-foreground text-background rounded-xl p-8 flex flex-col">
            <span className="font-mono text-xs tracking-widest text-background/50 uppercase mb-6">
              Reward calculator
            </span>

            <div className="mb-6">
              <p className="text-sm text-background/60 mb-3">Severity</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(severityBase) as Severity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`py-2 rounded-md text-sm font-medium transition-colors ${
                      severity === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/10 text-background/70 hover:bg-background/20"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-background/60">Confidence</p>
                <span className="font-mono text-sm">{confidence}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Confidence score"
              />
            </div>

            <div className="mt-auto pt-6 border-t border-background/10">
              <p className="text-sm text-background/60 mb-1">Reward amount</p>
              <p className="font-display text-5xl text-background">
                ${reward.toFixed(4)}
              </p>
              <p className="font-mono text-xs text-background/50 mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Settles in USDC via Arc
              </p>
            </div>
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Rewards are paid per validated, de-duplicated finding.{" "}
          <a href="#how-it-works" className="underline underline-offset-4 hover:text-foreground transition-colors inline-flex items-center gap-1">
            See how settlement works
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}
