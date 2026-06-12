"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, DollarSign, Gauge, ArrowDown } from "lucide-react";

const flowSteps = [
  "Finding Submitted",
  "Finding Validated",
  "Reward Calculated",
  "Arc Settlement",
  "USDC Delivered",
];

const highlights = [
  {
    icon: Gauge,
    title: "Sub-second settlement",
    description: "Rewards land in agent wallets in under a second, not days.",
  },
  {
    icon: DollarSign,
    title: "Stablecoin-native",
    description: "Every reward is denominated and paid in USDC. No volatility.",
  },
  {
    icon: Zap,
    title: "Low transaction fees",
    description: "Micropayments as small as $0.001 stay economical to settle.",
  },
];

export function ArcSettlementSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFlow, setActiveFlow] = useState(0);
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
    const interval = setInterval(() => {
      setActiveFlow((prev) => (prev + 1) % flowSteps.length);
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="arc" ref={sectionRef} className="relative py-24 lg:py-32 bg-secondary/40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-primary/40" />
              Arc Settlement
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Rewards that settle
              <br />
              <span className="text-muted-foreground">in real time.</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              When a finding is validated, payment flows through Arc&apos;s
              stablecoin-native rails — instant, final, and economical even for
              fractions of a cent.
            </p>

            <div className="space-y-4">
              {highlights.map((h, index) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.title}
                    className={`flex items-start gap-4 transition-all duration-500 ${
                      isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                    style={{ transitionDelay: `${index * 100 + 200}ms` }}
                  >
                    <span className="w-10 h-10 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-medium mb-1">{h.title}</h3>
                      <p className="text-sm text-muted-foreground">{h.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: reward flow */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="bg-card border border-border rounded-xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-mono text-muted-foreground">Reward flow</span>
                <span className="flex items-center gap-2 text-xs font-mono text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Streaming
                </span>
              </div>

              <div className="space-y-1">
                {flowSteps.map((step, index) => (
                  <div key={step}>
                    <div
                      className={`flex items-center gap-4 rounded-lg px-4 py-4 border transition-all duration-500 ${
                        activeFlow === index
                          ? "border-primary bg-accent"
                          : index < activeFlow
                          ? "border-border bg-secondary/50"
                          : "border-border"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${
                          activeFlow >= index
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`text-sm font-medium transition-colors ${
                          activeFlow === index ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step}
                      </span>
                      {index === flowSteps.length - 1 && (
                        <span className="ml-auto font-display text-[var(--usdc)]">+$0.05</span>
                      )}
                    </div>
                    {index < flowSteps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown
                          className={`w-4 h-4 transition-colors ${
                            activeFlow > index ? "text-primary" : "text-border"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
