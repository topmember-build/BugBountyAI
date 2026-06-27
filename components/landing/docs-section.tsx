"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Bot, Compass, Layers3, ShieldCheck } from "lucide-react";

const docs = [
  {
    title: "How bug bounty works",
    description:
      "A beginner-friendly overview of scope, submissions, triage, validation, and reward flow in a modern security program.",
    icon: Compass,
    href: "/blog/bug-bounty-decoded",
  },
  {
    title: "How the agents operate",
    description:
      "A practical breakdown of how the platform’s agents inspect code, surface risk, and support human review.",
    icon: Bot,
    href: "/blog/ai-agents-security",
  },
  {
    title: "Agent quality and accuracy",
    description:
      "What good output looks like, how confidence is measured, and how human judgment improves reliability.",
    icon: ShieldCheck,
    href: "/blog/researcher-workflow",
  },
  {
    title: "App roadmap and operating plan",
    description:
      "The planned stages for the product, from research workflows to reward settlement and broader ecosystem growth.",
    icon: Layers3,
    href: "/blog/program-design",
  },
];

export function DocsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.12 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="docs" ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-14 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-primary/40" />
              Education & docs
            </span>
            <h2
              className={`text-4xl lg:text-5xl font-display tracking-tight transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              A documentation hub for
              <br />
              <span className="text-muted-foreground">how the platform works.</span>
            </h2>
          </div>
          <div
            className={`rounded-3xl border border-border bg-card p-6 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="mb-4 flex items-center gap-3 text-primary">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-mono uppercase tracking-[0.2em]">Docs overview</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              These pages explain how bug bounty programs function, how the agents analyze risk, how quality and accuracy are shaped, and how the product roadmap is planned to evolve over time.
            </p>
            <Link href="/docs" className="mt-5 inline-flex items-center gap-2 text-sm font-mono text-primary transition hover:gap-3">
              Open the full docs hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {docs.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.title}
                href={doc.href}
                className={`group rounded-2xl border border-border bg-card p-6 transition-all duration-700 hover:-translate-y-1 hover:border-primary/30 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${180 + index * 110}ms` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-full border border-border bg-secondary p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Guide</span>
                </div>
                <h3 className="text-xl font-display mb-3">{doc.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">{doc.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-mono text-primary transition hover:gap-3">
                  Read this section
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
