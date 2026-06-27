import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogArticle } from "@/lib/blog-content";

export function generateStaticParams() {
  return [
    { slug: "bug-bounty-decoded" },
    { slug: "researcher-workflow" },
    { slug: "program-design" },
    { slug: "reward-settlement" },
    { slug: "ai-agents-security" },
  ];
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <Link href="/#blog" className="text-sm font-mono text-primary transition hover:opacity-80">
          ← Back to blog section
        </Link>

        <header className="rounded-3xl border border-border bg-card p-8 shadow-[0_0_80px_rgba(0,0,0,0.12)] lg:p-10">
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-primary">
            {article.category}
          </div>
          <h1 className="text-4xl font-display tracking-tight sm:text-5xl">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{article.summary}</p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <img src={article.image} alt={article.title} className="h-72 w-full object-cover" />
        </section>

        <section className="space-y-6">
          {article.sections.map((section) => (
            <article key={section.heading} className="rounded-2xl border border-border bg-card p-7">
              <h2 className="mb-3 text-2xl font-display">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mb-3 text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {section.diagram && (
                <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-background/70 p-5">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-primary">{section.diagram.title}</h3>
                    {section.diagram.note && <p className="text-xs text-muted-foreground">{section.diagram.note}</p>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {section.diagram.steps.map((step, index) => (
                      <div key={step} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-mono text-primary">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
