import Link from "next/link";
import { notFound } from "next/navigation";

const docs = [
  {
    slug: "bug-bounty-operations",
    title: "Bug bounty operations and lifecycle",
    summary:
      "A full technical explanation of how security programs are structured, how reports move through intake and validation, and how reward systems fit into the overall workflow.",
    sections: [
      {
        heading: "Program architecture",
        paragraphs: [
          "A modern bug bounty program is a multi-stage operating system. It begins with program definition, includes scope and policy controls, and then routes findings into triage, validation, remediation, and payout steps. Every stage needs explicit rules so the security team can keep the process fast without creating ambiguity.",
          "The purpose of the program is not only to discover vulnerabilities, but to create a repeatable system where researchers can contribute with confidence and the organization can receive high-quality findings without excessive noise.",
          "This means that the platform must handle both technical ingestion and operational policy. Intake must collect evidence, severity, reproduction steps, affected assets, and remediation notes. The triage layer must then decide whether the report is actionable, duplicate, out of scope, or ready for deeper review.",
        ],
        bullets: [
          "Scope and policy are the first controls",
          "Submission intake must be structured and auditable",
          "Triage must be consistent and measurable",
          "Resolution and payment should be linked to the same system",
        ],
        diagram: {
          title: "Core bug bounty lifecycle",
          steps: [
            "Program setup and scope definition",
            "Researcher submission and evidence capture",
            "Automated triage and duplicate detection",
            "Manual review and severity validation",
            "Remediation, decision, and payout",
          ],
        },
      },
      {
        heading: "Submission quality and signal control",
        paragraphs: [
          "The quality of a report is inversely proportional to the amount of ambiguity in it. Strong reports clearly identify the vulnerability, the user impact, the reproduction path, and the confidence level of the assessment. They also identify affected components, attack prerequisites, and the likely scope of compromise.",
          "High-quality submissions save engineering hours because they reduce the time required for triage. They also produce a stronger record of behavior for future incident review and for building internal security knowledge.",
          "The platform should therefore encourage structured reporting: concise summary, technical detail, evidence, impact, and next steps. This improves both internal decision speed and the long-term quality of the community.",
        ],
      },
      {
        heading: "Reward and trust design",
        paragraphs: [
          "Reward design is not only financial. It is an operational contract between the platform and the researcher. A fair reward model creates trust, encourages deeper investigation, and helps build a stable research community over time.",
          "A reliable payout flow should be deterministic. The system should record the decision, validate the reward policy, route the funds appropriately, and confirm the settlement outcome for all involved parties.",
          "This is particularly important in systems that support wallet-based settlement, because the payout route becomes part of the trust mechanism. Researchers need confidence that the reward will land in the intended destination without ambiguity or delay.",
        ],
      },
    ],
  },
  {
    slug: "agent-architecture",
    title: "Agent architecture, behavior, and operating model",
    summary:
      "An in-depth look at how the platform’s agents are structured, how they analyze security signals, how they interact with the rest of the system, and how their performance is managed over time.",
    sections: [
      {
        heading: "How the agents are organized",
        paragraphs: [
          "The agents are not a single monolithic analyzer. They are specialized actors that each focus on different classes of security concerns. In practice, this separation improves accuracy because each agent can be optimized for a narrower task: application logic, infrastructure risk, dependency weakness, network exposure, or blockchain-focused issues.",
          "This architecture supports both breadth and precision. An agent can examine a problem space in depth, but the overall system remains modular. Each agent can be updated independently, monitored separately, and evaluated against different benchmark cases.",
          "The system should treat each agent as a reasoning component within a broader pipeline. Its outputs are useful when they are grounded in evidence, linked to a specific code path or system surface, and routed to a decision layer that can interpret them in context.",
        ],
        bullets: [
          "Specialized agents reduce cognitive overlap",
          "Modularity improves maintainability and tuning",
          "Context-aware routing improves usefulness",
          "Human review remains the decision layer",
        ],
        diagram: {
          title: "Agent operating model",
          steps: [
            "Ingest repository, metadata, and program context",
            "Route the task to the appropriate specialist agent",
            "Analyze the relevant surface area",
            "Generate evidence-backed findings and confidence notes",
            "Hand off results to human review or downstream automation",
          ],
        },
      },
      {
        heading: "How the agents work in practice",
        paragraphs: [
          "In practical use, the system begins by gathering context. That context may include repository structure, code paths, known attack surfaces, dependency manifests, wallet logic, access rules, or historical findings. Once the context is available, the agent evaluates the target with layered reasoning and produces a structured output.",
          "The output should not be a vague suspicion. It should include the likely issue, the supporting evidence, the specific files or components involved, the expected impact, and the confidence level of the assessment. This allows the rest of the platform to grade the result instead of merely storing it.",
          "This is what makes the agent useful: it turns raw code or operational context into a structured security signal that can be ranked, reviewed, and acted upon.",
        ],
      },
      {
        heading: "Quality, accuracy, and reliability",
        paragraphs: [
          "Accuracy is not achieved by making the agent more verbose. It is achieved by improving the relevance and precision of the evidence it produces. The strongest agents do not simply offer opinions; they locate concrete behaviors, identify likely weaknesses, and explain why a finding is plausible.",
          "Reliability also depends on calibration. If an agent is highly confident in a weak signal, that is a failure mode. The system must preserve explicit confidence annotation, uncertainty handling, and follow-up review so that low-confidence results do not appear as final conclusions.",
          "In other words, the agents should be treated as high-leverage analysis tools, not autonomous arbiters of truth. The best systems combine agent assistance with human judgment to increase coverage while preserving accuracy.",
        ],
      },
    ],
  },
  {
    slug: "platform-roadmap",
    title: "Platform roadmap and long-term operating plan",
    summary:
      "A detailed roadmap that covers the product’s near-term build phases, medium-term expansion priorities, and long-term plans for wider adoption and ecosystem maturity.",
    sections: [
      {
        heading: "Phase one: core workflow stabilization",
        paragraphs: [
          "The first phase focuses on making the system dependable. That includes clean intake, strong submission validation, accurate report lifecycle handling, reliable settlement logic, and clear audit trails. At this stage the product should be useful enough to support real security researchers and real product teams without creating friction.",
          "The platform also needs to establish trust in its core data model: who submitted what, what happened to the report, how it was assessed, how it was rewarded, and what the final outcome was. Without that foundation, everything else becomes fragile.",
        ],
        bullets: [
          "Reliable report lifecycle",
          "Structured validation and updates",
          "Stable payout and settlement logic",
          "Clear auditability for all stages",
        ],
      },
      {
        heading: "Phase two: agent expansion and workflow automation",
        paragraphs: [
          "Once the core workflow is stable, the platform can expand into more automation. This includes broader agent specialization, better routing between agents, stronger evidence gathering, more structured severity scoring, and improved handling of duplicates and false positives.",
          "The goal is not to replace human review. It is to accelerate it. The system should surface the most relevant findings earlier and reduce the operational overhead of sorting through noise.",
        ],
      },
      {
        heading: "Phase three: ecosystem growth and governance",
        paragraphs: [
          "Long-term growth depends on governance and community trust. That means stronger policy controls, clearer quality standards, transparent reward logic, and better communication between researchers and program owners. The product should be ready to scale not only technically, but culturally.",
          "As adoption grows, the platform can support more program types, more specialized agents, more integrations, and deeper analytics that show how security work is progressing over time.",
        ],
        diagram: {
          title: "Roadmap structure",
          steps: [
            "Stabilize the core workflow",
            "Expand agent capability and automation",
            "Build trust, governance, and community scale",
            "Add richer analytics and integrations",
            "Create a self-sustaining security network",
          ],
        },
      },
    ],
  },
  {
    slug: "operational-guidelines",
    title: "Operational guidelines and best practices",
    summary:
      "A technical reference for operating the platform responsibly, improving report quality, and ensuring the agents and reward system remain aligned with the product’s goals.",
    sections: [
      {
        heading: "Governance and decision quality",
        paragraphs: [
          "The platform should define how disputes are handled, how severity is interpreted, how reward outcomes are documented, and how low-confidence findings are marked. Without governance rules, the system becomes inconsistent and harder to trust.",
          "This is especially important when multiple stakeholders are involved: researchers, program owners, reviewers, and automation systems. Clear policy boundaries prevent operational drift and reduce unnecessary conflict.",
        ],
      },
      {
        heading: "Operational feedback loops",
        paragraphs: [
          "The system should capture feedback at each stage. That includes report quality, review time, false positive rates, reward fairness, and communication effectiveness. These signals help the product improve over time instead of relying on intuition alone.",
          "Each loop should be visible to the operators, because the risk of silent failure is high when the system gets more complex. Good instrumentation is part of the product itself.",
        ],
        diagram: {
          title: "Feedback loop",
          steps: [
            "Capture report and review data",
            "Measure outcome quality and speed",
            "Identify weak points in the flow",
            "Tune the policy or agent behavior",
            "Re-evaluate the next cycle",
          ],
        },
      },
    ],
  },
];

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs.find((item) => item.slug === slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <Link href="/docs" className="text-sm font-mono text-primary transition hover:opacity-80">
          ← Back to docs hub
        </Link>

        <header className="rounded-3xl border border-border bg-card p-8 shadow-[0_0_80px_rgba(0,0,0,0.12)] lg:p-10">
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.2em] text-primary">
            Technical documentation
          </div>
          <h1 className="text-4xl font-display tracking-tight sm:text-5xl">{doc.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{doc.summary}</p>
        </header>

        <section className="space-y-6">
          {doc.sections.map((section) => (
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
                  <h3 className="mb-3 text-sm font-mono uppercase tracking-[0.2em] text-primary">{section.diagram.title}</h3>
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
