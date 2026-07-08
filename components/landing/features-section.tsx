"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldAlert, GitBranch, Package, FileCode2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const agents = [
  {
    number: "01",
    name: "Security Agent",
    goal: "Find security vulnerabilities",
    description:
      "Hunts authentication issues, authorization flaws, OWASP vulnerabilities, SQL injection, XSS, hardcoded credentials, and unsafe code execution.",
    icon: ShieldAlert,
    focus: ["Authentication", "OWASP Top 10", "SQL injection", "XSS", "Hardcoded secrets"],
  },
  {
    number: "02",
    name: "Logic Agent",
    goal: "Find flaws traditional scanners miss",
    description:
      "Reviews broken workflows, incorrect calculations, business logic flaws, validation issues, and permission mistakes that scanners overlook.",
    icon: GitBranch,
    focus: ["Broken workflows", "Calculation errors", "Business logic", "Validation", "Permissions"],
  },
  {
    number: "03",
    name: "Dependency Agent",
    goal: "Identify ecosystem threats",
    description:
      "Audits vulnerable packages, outdated libraries, and known CVEs across your dependency tree to surface supply-chain risk.",
    icon: Package,
    focus: ["Vulnerable packages", "Outdated libraries", "Known CVEs", "Risk analysis"],
  },
  {
    number: "04",
    name: "Smart Contract Agent",
    goal: "Analyze blockchain applications",
    description:
      "Inspects reentrancy, access control, overflow issues, economic attacks, and gas inefficiencies in on-chain code.",
    icon: FileCode2,
    focus: ["Reentrancy", "Access control", "Overflow", "Economic attacks", "Gas efficiency"],
  },
];

function AgentCard({ agent, index }: { agent: typeof agents[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = agent.icon;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative bg-card border border-border rounded-xl p-8 hover-lift hover:border-primary/30 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <span className="font-mono text-sm text-muted-foreground">{agent.number}</span>
      </div>

      <h3 className="text-2xl font-display mb-2">{agent.name}</h3>
      <p className="text-sm font-mono text-primary mb-4">{agent.goal}</p>
      <p className="text-muted-foreground leading-relaxed mb-6">{agent.description}</p>

      <div className="flex flex-wrap gap-2">
        {agent.focus.map((item) => (
          <span
            key={item}
            className="text-xs font-mono px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AgentsSection() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
    <section id="agents" ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-20 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-primary/40" />
            {t("audit_swarm")}
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {t("features_agents_section_title")}
            <br />
            <span className="text-muted-foreground">{t("features_agents_section_sub")}</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {t("features_agents_section_sub")}
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {agents.map((agent, index) => (
            <AgentCard key={agent.number} agent={agent} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
