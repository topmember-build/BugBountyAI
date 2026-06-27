"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles, Radar, Wallet } from "lucide-react";
import { blogArticles } from "@/lib/blog-content";

const featuredArticle = blogArticles.find((article) => article.featured);
const articles = blogArticles.filter((article) => !article.featured);

export function BlogSection() {
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
    <section id="blog" ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%)]" />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-14 max-w-3xl">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-primary/40" />
            Bug bounty journal
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            A richer view of bug bounty.
            <br />
            <span className="text-muted-foreground">From research to reward, explained with clarity.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            This section blends storytelling, visual context, and practical analysis so readers can understand how bounty programs work, why they matter, and how modern platforms turn real findings into measurable outcomes.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {featuredArticle && (
            <article
              className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-0 shadow-[0_0_80px_rgba(0,0,0,0.15)] transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <img
                src={featuredArticle.image}
                alt="Security analyst reviewing a vulnerability report"
                className="h-72 w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="p-8 lg:p-10">
                <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-primary">
                  {featuredArticle.category}
                </div>
                <h3 className="text-2xl lg:text-3xl font-display mb-4">{featuredArticle.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">{featuredArticle.summary}</p>
                <p className="text-sm leading-relaxed text-foreground/85 mb-6">
                  {featuredArticle.analysis}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {featuredArticle.stats?.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-mono text-secondary-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/blog/${featuredArticle.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-mono text-primary transition hover:gap-3"
                >
                  Read the full guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          )}

          <div className="space-y-6">
            {articles.slice(0, 2).map((article, index) => {
              const Icon = index === 0 ? Radar : index === 1 ? ShieldCheck : Wallet;
              return (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className={`group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-700 hover:-translate-y-1 hover:border-primary/30 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${200 + index * 120}ms` }}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{article.category}</span>
                      <div className="rounded-full border border-border bg-secondary p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="text-xl font-display mb-2">{article.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{article.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {articles.slice(2).map((article, index) => {
            const Icon = index === 0 ? Wallet : Sparkles;
            return (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className={`group rounded-2xl border border-border bg-card p-6 transition-all duration-700 hover:-translate-y-1 hover:border-primary/30 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${400 + index * 120}ms` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">{article.category}</span>
                  <div className="rounded-full border border-border bg-secondary p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-xl font-display mb-3">{article.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">{article.description}</p>
                <span className="inline-flex items-center gap-2 text-sm font-mono text-primary transition hover:gap-3">
                  Read the perspective
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
