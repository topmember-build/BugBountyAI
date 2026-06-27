import Link from "next/link";

const docs = [
  {
    title: "Bug bounty operations and lifecycle",
    summary:
      "A full technical explanation of how security programs are structured, how reports move through intake and validation, and how reward systems fit into the overall workflow.",
    href: "/docs/bug-bounty-operations",
  },
  {
    title: "Agent architecture, behavior, and operating model",
    summary:
      "An in-depth look at how the platform’s agents are structured, how they analyze security signals, how they interact with the rest of the system, and how their performance is managed over time.",
    href: "/docs/agent-architecture",
  },
  {
    title: "Platform roadmap and long-term operating plan",
    summary:
      "A detailed roadmap that covers the product’s near-term build phases, medium-term expansion priorities, and long-term plans for wider adoption and ecosystem maturity.",
    href: "/docs/platform-roadmap",
  },
  {
    title: "Operational guidelines and best practices",
    summary:
      "A technical reference for operating the platform responsibly, improving report quality, and ensuring the agents and reward system remain aligned with the product’s goals.",
    href: "/docs/operational-guidelines",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <Link href="/" className="text-sm font-mono text-primary transition hover:opacity-80">
          ← Back to home
        </Link>

        <header className="rounded-3xl border border-border bg-card p-8 shadow-[0_0_80px_rgba(0,0,0,0.12)] lg:p-10">
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-primary">
            Documentation hub
          </div>
          <h1 className="text-4xl font-display tracking-tight sm:text-5xl">Bug bounty and agent operations documentation</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            This documentation hub is designed as a technical knowledge base. It explains the platform’s full operating model, the mechanics of the agents, the lifecycle of bug bounty work, and the roadmap for how the product is expected to evolve.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {docs.map((doc) => (
            <Link key={doc.title} href={doc.href} className="rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-primary/30">
              <h2 className="text-2xl font-display mb-3">{doc.title}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">{doc.summary}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
