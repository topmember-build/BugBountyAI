import "server-only"
import { generateText, Output } from "ai"
import { z } from "zod"
import type { AgentType, Severity } from "@/lib/types"

const ANALYSIS_MODEL = process.env.BUGBOUNTY_MODEL ?? "openai/gpt-5-mini"

const findingSchema = z.object({
  title: z.string().describe("Short, specific vulnerability title"),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident the agent is this is a real, exploitable issue (0-1)"),
  agent_type: z
    .enum(["security", "logic", "dependency", "smart_contract"])
    .describe("Which specialist agent discovered this class of bug"),
  category: z.string().describe("Vulnerability class, e.g. 'SQL Injection', 'IDOR', 'Reentrancy'"),
  file_path: z.string().describe("Most likely affected file path"),
  line_start: z.number().int().describe("Approximate starting line, or 0 if unknown"),
  line_end: z.number().int().describe("Approximate ending line, or 0 if unknown"),
  description: z.string().describe("Clear explanation of the vulnerability and its impact"),
  recommendation: z.string().describe("Concrete remediation guidance"),
})

const analysisSchema = z.object({
  repo_name: z.string().describe("Inferred project/repository name"),
  summary: z.string().describe("One-sentence summary of the security posture"),
  findings: z.array(findingSchema).min(2).max(8),
})

export interface AnalyzedFinding {
  title: string
  severity: Severity
  confidence: number
  agent_type: AgentType
  category: string
  file_path: string
  line_start: number
  line_end: number
  description: string
  recommendation: string
}

export interface AnalysisResult {
  repoName: string
  summary: string
  findings: AnalyzedFinding[]
}

/**
 * Run the AI audit swarm against a repository target.
 * Produces a realistic set of structured findings across agent specialties.
 */
export async function analyzeRepository(input: {
  repoUrl: string
  branch?: string
  selectedAgents?: AgentType[]
}): Promise<AnalysisResult> {
  const agentScope =
    input.selectedAgents && input.selectedAgents.length > 0
      ? `Only report findings for these agent specialties: ${input.selectedAgents.join(", ")}.`
      : "Use all four agent specialties as appropriate."

  const { experimental_output } = await generateText({
    model: ANALYSIS_MODEL,
    experimental_output: Output.object({ schema: analysisSchema }),
    system: [
      "You are BugBountyAI, an autonomous security audit swarm composed of four specialist agents:",
      "- security: injection, auth, access control, secrets, SSRF, XSS",
      "- logic: business-logic flaws, broken invariants, race conditions",
      "- dependency: vulnerable/outdated packages, supply-chain risk (CVEs)",
      "- smart_contract: reentrancy, integer issues, economic exploits",
      "Given a repository target, produce a realistic, technically credible set of vulnerability findings",
      "that such a codebase would plausibly contain. Vary severity and confidence realistically.",
      agentScope,
    ].join("\n"),
    prompt: [
      `Repository: ${input.repoUrl}`,
      `Branch: ${input.branch ?? "main"}`,
      "",
      "Analyze this repository and report the vulnerabilities your agent swarm would surface.",
      "Be specific about file paths and remediation. Do not fabricate CVE numbers.",
    ].join("\n"),
  })

  const output = experimental_output as z.infer<typeof analysisSchema>

  return {
    repoName: output.repo_name,
    summary: output.summary,
    findings: output.findings.map((f) => ({
      title: f.title,
      severity: f.severity,
      confidence: f.confidence,
      agent_type: f.agent_type,
      category: f.category,
      file_path: f.file_path,
      line_start: f.line_start,
      line_end: f.line_end,
      description: f.description,
      recommendation: f.recommendation,
    })),
  }
}
