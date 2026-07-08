"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";

const steps = (t: (k: string) => string) => [
  {
    number: "01",
    title: t("how_upload_title"),
    description: t("how_upload_description"),
    code: `$ bugbounty upload --repo https://github.com/acme/payments-api

  ↳ Resolving repository...
  ↳ 1,284 files indexed
  ↳ Languages: TypeScript, Solidity
  ✓ Ready for audit`,
  },
  {
    number: "02",
    title: t("how_step_2_title"),
    description: t("how_step_2_description"),
    code: `$ bugbounty audit --swarm

  ↳ Security Agent      online
  ↳ Logic Agent         online
  ↳ Dependency Agent    online
  ↳ Smart Contract Agent online
  ✓ 4 agents deployed`,
  },
  {
    number: "03",
    title: t("how_step_3_title"),
    description: t("how_step_3_description"),
    code: `[orchestrator] receiving findings...

  Security Agent     → 7 findings
  Logic Agent        → 3 findings
  Dependency Agent   → 5 findings
  → merging 4 duplicates
  ✓ 11 unique findings`,
  },
  {
    number: "04",
    title: t("how_step_4_title"),
    description: t("how_step_4_description"),
    code: `[rewards] distributing via Arc...

  CRITICAL  reentrancy   → $0.050
  HIGH      auth bypass  → $0.020
  MEDIUM    open redirect→ $0.010
  ✓ Settled in 0.8s · USDC delivered`,
  },
];

export function HowItWorksSection() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps(t).length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden"
    >
      {/* Diagonal lines pattern */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            currentColor 40px,
            currentColor 41px
          )`
        }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-background/50 mb-6">
            <span className="w-8 h-px bg-background/30" />
            {t("nav_how_it_works")}
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {t("upload_once")}
            <br />
            <span className="text-background/50">{t("upload_once")}</span>
          </h2>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Steps */}
          <div className="space-y-0">
            {steps(t).map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-8 border-b border-background/10 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-mono text-sm text-background/40 mt-2">{step.number}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-background/60 leading-relaxed">
                      {step.description}
                    </p>
                    
                    {/* Progress indicator */}
                    {activeStep === index && (
                      <div className="mt-4 h-px bg-background/20 overflow-hidden">
                        <div 
                          className="h-full bg-primary w-0"
                          style={{
                            animation: 'progress 5s linear forwards'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Code display */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-background/10 rounded-xl overflow-hidden bg-background/[0.03]">
              {/* Window header */}
              <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                  <div className="w-3 h-3 rounded-full bg-background/20" />
                </div>
                <span className="text-xs font-mono text-background/40">audit.log</span>
              </div>

              {/* Code content */}
              <div className="p-8 font-mono text-sm min-h-[280px]">
                <pre className="text-background/70 whitespace-pre-wrap">
                  {steps(t)[activeStep].code.split('\n').map((line, lineIndex) => (
                    <div 
                      key={`${activeStep}-${lineIndex}`} 
                      className="leading-loose code-line-reveal"
                      style={{ 
                        animationDelay: `${lineIndex * 80}ms`,
                      }}
                    >
                      <span className="inline-flex">
                        {line.split('').map((char, charIndex) => (
                          <span
                            key={`${activeStep}-${lineIndex}-${charIndex}`}
                            className="code-char-reveal"
                            style={{
                              animationDelay: `${lineIndex * 80 + charIndex * 12}ms`,
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              {/* Status */}
              <div className="px-6 py-4 border-t border-background/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-mono text-background/40">{t("orchestrator_active")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        .code-line-reveal {
          opacity: 0;
          transform: translateX(-8px);
          animation: lineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        
        @keyframes lineReveal {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .code-char-reveal {
          opacity: 0;
          filter: blur(8px);
          animation: charReveal 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        
        @keyframes charReveal {
          to {
            opacity: 1;
            filter: blur(0);
          }
        }
      `}</style>
    </section>
  );
}
