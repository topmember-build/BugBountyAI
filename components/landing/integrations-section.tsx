"use client";

import { useEffect, useState, useRef } from "react";

type Severity = "Critical" | "High" | "Medium" | "Low" | "Informational";

const severityStyles: Record<Severity, string> = {
  Critical: "bg-[var(--critical)]/10 text-[var(--critical)] border-[var(--critical)]/30",
  High: "bg-[var(--high)]/10 text-[var(--high)] border-[var(--high)]/30",
  Medium: "bg-[var(--medium)]/15 text-[oklch(0.5_0.13_85)] border-[var(--medium)]/40",
  Low: "bg-[var(--low)]/10 text-[var(--low)] border-[var(--low)]/30",
  Informational: "bg-secondary text-muted-foreground border-border",
};

const findings = [
  {
    title: "Reentrancy in withdraw()",
    description: "External call before state update allows recursive withdrawals draining the contract balance.",
    severity: "Critical" as Severity,
    confidence: 97,
    file: "contracts/Vault.sol:142",
    fix: "Apply checks-effects-interactions; update balance before transfer.",
    agent: "Smart Contract Agent",
    reward: "$0.050",
  },
  {
    title: "Authentication bypass on /admin",
    description: "Missing role check lets any authenticated user reach admin-only endpoints.",
    severity: "High" as Severity,
    confidence: 91,
    file: "src/routes/admin.ts:28",
    fix: "Add requireRole('admin') middleware to the router.",
    agent: "Security Agent",
    reward: "$0.020",
  },
  {
    title: "Incorrect fee calculation",
    description: "Rounding occurs before multiplication, undercharging platform fees on large orders.",
    severity: "Medium" as Severity,
    confidence: 84,
    file: "src/billing/fees.ts:61",
    fix: "Multiply before rounding and use integer math for currency.",
    agent: "Logic Agent",
    reward: "$0.010",
  },
  {
    title: "Outdated dependency: lodash@4.17.11",
    description: "Known prototype pollution CVE-2019-10744 present in transitive dependency.",
    severity: "Low" as Severity,
    confidence: 99,
    file: "package-lock.json",
    fix: "Upgrade lodash to >=4.17.21.",
    agent: "Dependency Agent",
    reward: "$0.001",
  },
];

const severityLevels: { label: Severity; reward: string }[] = [
  { label: "Critical", reward: "$0.05" },
  { label: "High", reward: "$0.02" },
  { label: "Medium", reward: "$0.01" },
  { label: "Low", reward: "$0.001" },
  { label: "Informational", reward: "—" },
];

function FindingCard({ finding, index }: { finding: typeof findings[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bg-card border border-border rounded-xl p-6 hover-lift hover:border-primary/30 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs font-mono px-2.5 py-1 rounded-md border ${severityStyles[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="text-xs font-mono px-2.5 py-1 rounded-md border border-border text-muted-foreground">
          {finding.confidence}% confidence
        </span>
        <span className="ml-auto text-sm font-display text-[var(--usdc)]">{finding.reward}</span>
      </div>

      <h3 className="text-lg font-medium mb-2">{finding.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{finding.description}</p>

      <div className="space-y-2 text-sm border-t border-border pt-4">
        <div className="flex gap-2">
          <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs pt-0.5">FILE</span>
          <span className="font-mono text-xs text-foreground break-all">{finding.file}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs pt-0.5">FIX</span>
          <span className="text-foreground/80 text-sm">{finding.fix}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs pt-0.5">AGENT</span>
          <span className="text-primary text-sm font-medium">{finding.agent}</span>
        </div>
      </div>
    </div>
  );
}

export function FindingsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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
    <section id="findings" ref={sectionRef} className="relative py-24 lg:py-32 bg-secondary/40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div
          className={`max-w-3xl mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-primary/40" />
            Findings
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
            Every vulnerability,
            <br />
            <span className="text-muted-foreground">scored and ranked.</span>
          </h2>
        </div>

        {/* Severity legend */}
        <div className="flex flex-wrap gap-2 mb-10">
          {severityLevels.map((level) => (
            <span
              key={level.label}
              className={`inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-md border ${severityStyles[level.label]}`}
            >
              {level.label}
              <span className="opacity-70">{level.reward}</span>
            </span>
          ))}
        </div>

        {/* Findings grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {findings.map((finding, index) => (
            <FindingCard key={finding.title} finding={finding} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
