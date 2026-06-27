export type BlogArticle = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  featured?: boolean;
  stats?: string[];
  analysis?: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    diagram?: {
      title: string;
      note?: string;
      steps: string[];
    };
  }>;
};

export const blogArticles: BlogArticle[] = [
  {
    slug: "bug-bounty-decoded",
    category: "Featured analysis",
    title: "Bug bounty, decoded: how modern security programs actually work",
    summary:
      "From reconnaissance to triage and payout, this guide breaks down the full lifecycle of a bug bounty engagement and why strong programs attract better findings.",
    description:
      "The most effective researchers combine sharp recon, careful validation, and clear communication. Programs that reward depth over volume tend to produce the most valuable reports.",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80",
    featured: true,
    stats: ["Recon", "Triage", "Validation", "Reward"],
    analysis:
      "The most effective researchers combine sharp recon, careful validation, and clear communication. Programs that reward depth over volume tend to produce the most valuable reports.",
    sections: [
      {
        heading: "What a modern bug bounty program looks like",
        paragraphs: [
          "A well-run program is not just a payout faucet. It is a living security system that combines scope definition, intake flow, validation, and communication. Each stage needs clarity so researchers can move quickly without wasting effort on low-value reports.",
          "The strongest programs define what is in scope, what is out of scope, and how findings should be submitted. That clarity creates trust and helps contributors focus on the issues that matter most.",
          "In practice, the best programs operate like a controlled operating system for security work: intake is organized, triage is consistent, fixes are actionable, and rewards feel fair and predictable.",
        ],
        bullets: [
          "Clear scope boundaries reduce noise",
          "Fast triage keeps momentum high",
          "Transparent communication improves trust",
          "Consistent follow-up helps teams learn from every report",
        ],
      },
      {
        heading: "Why good reports beat noisy submissions",
        paragraphs: [
          "High-value findings are usually built around depth. A researcher should explain the vulnerability, the impact, the reproduction path, and the likely blast radius in a way that a security team can act on right away.",
          "The best reports do not simply say that something broke. They show how it broke, why it matters, and what a realistic attacker could achieve with it.",
          "When a report includes context, evidence, and a clear remediation path, it shortens the entire cycle from discovery to fix. That is what turns a noisy submission into a real security improvement.",
        ],
        diagram: {
          title: "Operational workflow",
          note: "A well-structured report travels through the same path every time.",
          steps: [
            "Scope and intake",
            "Reproduce and validate",
            "Document the root cause",
            "Prioritize severity and impact",
            "Submit, triage, and reward",
          ],
        },
      },
      {
        heading: "From report to reward",
        paragraphs: [
          "Once a report is accepted, the payout process becomes part of the experience. Researchers are more likely to keep participating when settlement is prompt, transparent, and linked to the correct wallet or payment route.",
          "That is why modern platforms increasingly combine security automation with trustable settlement flows, making the full journey feel coherent from first submission to final payout.",
          "The most durable programs do not treat rewards as a final checkbox. They treat them as part of the trust loop that keeps the community engaged over the long term.",
        ],
      },
    ],
  },
  {
    slug: "researcher-workflow",
    category: "Mindset",
    title: "The researcher workflow behind high-signal reports",
    summary:
      "Great submissions are built on context, evidence, and impact. The best bug hunters show the vulnerability, the root cause, and the realistic blast radius.",
    description:
      "A structured workflow helps researchers move faster while keeping quality high. The strongest submissions often come from teams who balance automation with careful judgment.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    sections: [
      {
        heading: "The workflow that separates strong reports from weak ones",
        paragraphs: [
          "Research usually starts with recon, then moves into reproduction, validation, and evidence capture. Good hunters document every step so a triage team can understand the issue quickly.",
          "The key is not simply finding a bug. It is presenting it in a way that makes it actionable, measurable, and worth the team’s time to fix.",
          "Teams that work in a disciplined loop tend to produce higher-quality findings because they spend less time chasing dead ends and more time validating the findings that genuinely matter.",
        ],
      },
      {
        heading: "What readers want to see",
        paragraphs: [
          "A concise summary, a clear reproduction path, and a realistic severity estimate usually matter more than a long wall of technical prose.",
          "Many teams prefer reports that include evidence, suspected root cause, and a short explanation of why the issue matters to the product or users.",
          "The most persuasive reports read like a calm, factual walkthrough of the issue rather than an emotional escalation. That makes them easier to trust and faster to act on.",
        ],
        diagram: {
          title: "Research loop",
          note: "The best reports are built in sequence, not in a rush.",
          steps: [
            "Discover the target behavior",
            "Reproduce the issue carefully",
            "Capture evidence and impact",
            "Write a concise remediation note",
            "Submit with confidence and clarity",
          ],
        },
      },
    ],
  },
  {
    slug: "program-design",
    category: "Program design",
    title: "Why strong bounty programs attract better findings",
    summary:
      "Clear scope, fast triage, and fair payouts shape the quality of the hunting experience. A healthy program rewards consistency and trust.",
    description:
      "The most effective programs are built around clarity and reliability. Researchers return when they understand the rules and feel that good work will be recognized.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    sections: [
      {
        heading: "Design choices that improve participation",
        paragraphs: [
          "Program structure influences the quality of reports more than most teams expect. When the scope is explicit and the process is predictable, submissions become more focused and more useful.",
          "That also helps security teams spend less time filtering out noise and more time addressing credible issues.",
          "A thoughtful scope definition acts like guardrails; it helps researchers stay efficient while giving the program a higher signal-to-noise ratio.",
        ],
      },
      {
        heading: "The value of a healthy feedback loop",
        paragraphs: [
          "Researchers want to know that their work is being seen. A thoughtful response plan, even when the report is not accepted, builds trust and keeps the program strong over time.",
          "The long-term effect is simple: better communication creates better participation, and better participation produces better outcomes.",
          "Healthy programs make feedback visible, respectful, and consistent so contributors know that the process itself is trustworthy.",
        ],
        diagram: {
          title: "Program operating model",
          note: "Good design keeps the experience clear from the first invitation to the final resolution.",
          steps: [
            "Define scope and expectations",
            "Publish clear submission rules",
            "Review reports with consistent triage",
            "Respond with actionable feedback",
            "Reward fairly and document learnings",
          ],
        },
      },
    ],
  },
  {
    slug: "reward-settlement",
    category: "Monetization",
    title: "How rewards and settlement create long-term momentum",
    summary:
      "When payouts are transparent and reliable, researchers keep returning with better insights and stronger relationships with the team.",
    description:
      "Reward systems matter because they shape not only economics but also trust. A settlement experience that feels fair encourages deeper engagement and more thoughtful reporting.",
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80",
    sections: [
      {
        heading: "Why settlement matters as much as severity",
        paragraphs: [
          "A researcher’s decision to participate is shaped by more than the label on a report. It is shaped by the confidence that the payout process will be handled properly and on time.",
          "If settlement feels opaque or unreliable, the program loses momentum even when the findings are strong.",
          "In the eyes of a contributor, the reward process is part of the product experience. If it feels broken, trust erodes quickly.",
        ],
      },
      {
        heading: "Building a durable reward experience",
        paragraphs: [
          "Reliable payout routing, clear policy visibility, and thoughtful support make the difference between a one-time program and a recurring community.",
          "That is exactly the kind of environment that helps security teams grow a trusted, consistent researcher base.",
          "The strongest systems make reward logic explicit so both sides understand what is being paid, why it is being paid, and when it should arrive.",
        ],
        diagram: {
          title: "Settlement flow",
          note: "A healthy reward pipeline turns a report into trust and momentum.",
          steps: [
            "Accept and validate the report",
            "Calculate the reward based on policy",
            "Route funds to the correct wallet",
            "Confirm settlement and record outcomes",
            "Close the loop with follow-up and feedback",
          ],
        },
      },
    ],
  },
  {
    slug: "ai-agents-security",
    category: "Future",
    title: "AI agents and the next layer of security analysis",
    summary:
      "Autonomous agents are changing how teams inspect code, chase edge cases, and prioritize risk. The future is hybrid: fast automation and human judgment together.",
    description:
      "AI-assisted analysis adds speed, but it does not replace context. The strongest security teams use automation to widen coverage while preserving human interpretation.",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
    sections: [
      {
        heading: "How automation changes the workflow",
        paragraphs: [
          "Agents can scan large codebases, compare implementations, and surface suspicious patterns across many paths. That makes them valuable for breadth, especially in fast-moving engineering teams.",
          "Still, the best outcomes come when automation gives humans a stronger starting point instead of a final answer.",
          "Automation is most useful when it widens coverage and surfaces risk early, leaving the final judgment to the humans who understand the product context best.",
        ],
      },
      {
        heading: "The future of hybrid review",
        paragraphs: [
          "Modern security programs increasingly blend machine-assisted analysis with human review. That balance can improve both speed and precision while retaining the nuance that only experienced researchers can bring.",
          "The result is not a replacement for human expertise. It is a stronger, faster loop for discovering risk.",
          "That hybrid model is where the next generation of security operations is heading: fast signals, guided context, and expert interpretation working together.",
        ],
        diagram: {
          title: "Hybrid analysis loop",
          note: "Automation scales the search, while humans provide nuance and judgment.",
          steps: [
            "Scan and correlate signals",
            "Surface likely security risk",
            "Prioritize the most relevant findings",
            "Route the case to expert review",
            "Resolve with context-rich action",
          ],
        },
      },
    ],
  },
];

export function getBlogArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}
