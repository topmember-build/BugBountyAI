"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, GitBranch, Package, FileCode2, Github, Upload, Check } from "lucide-react";

const selectableAgents = [
  { id: "security", name: "Security Agent", icon: ShieldAlert, task: "Scanning authentication" },
  { id: "logic", name: "Logic Agent", icon: GitBranch, task: "Reviewing payment flows" },
  { id: "dependency", name: "Dependency Agent", icon: Package, task: "Checking packages" },
  { id: "contract", name: "Smart Contract Agent", icon: FileCode2, task: "Auditing contract logic" },
];

export function AuditSwarmSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>(["security", "logic", "dependency"]);
  const [running, setRunning] = useState(true);
  const [progress, setProgress] = useState<Record<string, number>>({});
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

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = { ...prev };
        selected.forEach((id) => {
          const current = next[id] ?? 0;
          next[id] = current >= 100 ? 8 : Math.min(100, current + Math.random() * 12);
        });
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [running, selected]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <section id="audit" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-primary/40" />
            Launch an audit
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight">
            Select your swarm.
            <br />
            <span className="text-muted-foreground">Watch it work in real time.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: select + upload */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="bg-card border border-border rounded-xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl">Choose agents</h3>
                {selected.length > 0 && (
                  <span className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-accent text-accent-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Audit Swarm Ready
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {selectableAgents.map((agent) => {
                  const Icon = agent.icon;
                  const isOn = selected.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => toggle(agent.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all duration-300 ${
                        isOn
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isOn ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium leading-tight">{agent.name}</span>
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isOn ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {isOn && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Upload */}
              <h3 className="font-display text-xl mb-4">Add your code</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4 hover:border-primary/40 transition-colors">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drag &amp; drop a ZIP or source files
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 mb-6">
                <Github className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-muted-foreground truncate">
                  github.com/acme/payments-api
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-mono text-primary shrink-0">
                  <Check className="w-3 h-3" /> Connected
                </span>
              </div>

              <Button
                onClick={() => setRunning(true)}
                disabled={selected.length === 0}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-full"
              >
                Launch Audit with {selected.length} agent{selected.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

          {/* Right: live execution */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Audit Execution</span>
                <span className="flex items-center gap-2 text-xs font-mono text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              </div>
              <div className="p-6 space-y-5">
                {selected.length === 0 && (
                  <p className="text-sm text-muted-foreground font-mono py-8 text-center">
                    Select at least one agent to begin.
                  </p>
                )}
                {selectableAgents
                  .filter((a) => selected.includes(a.id))
                  .map((agent) => {
                    const Icon = agent.icon;
                    const pct = Math.round(progress[agent.id] ?? 0);
                    return (
                      <div key={agent.id}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-7 h-7 rounded-md bg-accent text-primary flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">{agent.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-2 pl-10">
                          {agent.task}
                          <span className="inline-block animate-pulse">...</span>
                        </p>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden ml-10">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
