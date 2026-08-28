import "server-only"
import { generateText, Output } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { z } from "zod"
import type { AgentType, Severity } from "@/lib/types"

// Provider API Key configuration
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_TOKEN || ""
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ""
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1"
const SIE_MODE = (process.env.BUGBOUNTY_SIE_MODE ?? "consensus") as "consensus" | "router" | "openai" | "deepseek"

// Instantiated Provider Clients
export const openaiProvider = createOpenAI({
  apiKey: OPENAI_KEY || "placeholder-key",
})

export const deepseekProvider = createDeepSeek({
  apiKey: DEEPSEEK_KEY || "placeholder-key",
  baseURL: DEEPSEEK_BASE_URL,
})

export interface SIEFinding {
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
  models_agreeing?: string[]
  consensus_score?: number
}

export interface SIEResult {
  repoName: string
  summary: string
  findings: SIEFinding[]
  engine_meta?: {
    mode: string
    models_executed: string[]
    consensus_rate: number
  }
}

/**
 * Route specific agent types to specialized LLM models based on the SIE Routing Matrix:
 * - Smart Contract / Invariant reasoning -> DeepSeek (Reasoner / Chat)
 * - Web / API Security & Access Control -> OpenAI (GPT-4o)
 * - Logic Analysis -> Dual-Model Consensus
 * - Dependency / CVE -> OpenAI (GPT-4o-mini)
 */
export function resolveModelForSpecialty(agentType: AgentType): any {
  if (agentType === "smart_contract") {
    return DEEPSEEK_KEY
      ? deepseekProvider("deepseek-reasoner")
      : openaiProvider(process.env.BUGBOUNTY_MODEL || "gpt-5-mini")
  }
  if (agentType === "security") {
    return OPENAI_KEY
      ? openaiProvider("gpt-4o")
      : openaiProvider(process.env.BUGBOUNTY_MODEL || "gpt-5-mini")
  }
  if (agentType === "dependency") {
    return OPENAI_KEY
      ? openaiProvider("gpt-4o-mini")
      : openaiProvider(process.env.BUGBOUNTY_MODEL || "gpt-5-mini")
  }
  // Default to primary configured analysis model
  return openaiProvider(process.env.BUGBOUNTY_MODEL || "gpt-5-mini")
}

/**
 * Execute a multi-model consensus audit run across OpenAI and DeepSeek in parallel.
 * Merges independent findings and computes multi-model agreement & confidence scores.
 */
export async function runMultiModelConsensusAudit<T extends z.ZodType<any>>(options: {
  system: string
  prompt: string
  schema: T
}): Promise<z.infer<T>> {
  const { system, prompt, schema } = options
  const modelsExecuted: string[] = []

  const primaryModel = process.env.BUGBOUNTY_MODEL || "gpt-5-mini"
  const canRunOpenAI = Boolean(OPENAI_KEY || process.env.AI_GATEWAY_TOKEN)
  const canRunDeepSeek = Boolean(DEEPSEEK_KEY)

  // Single provider mode fallback if multi-model keys aren't configured
  if (!canRunDeepSeek || SIE_MODE === "openai") {
    modelsExecuted.push("openai")
    const { experimental_output } = await generateText({
      model: primaryModel.includes("/") ? primaryModel : `openai/${primaryModel}`,
      experimental_output: Output.object({ schema }),
      system,
      prompt,
    })
    return experimental_output as z.infer<T>
  }

  if (SIE_MODE === "deepseek") {
    modelsExecuted.push("deepseek")
    const { experimental_output } = await generateText({
      model: "deepseek/deepseek-chat",
      experimental_output: Output.object({ schema }),
      system,
      prompt,
    })
    return experimental_output as z.infer<T>
  }

  // Parallel Execution: Run OpenAI & DeepSeek simultaneously
  const tasks: Promise<{ source: string; result: any | null }>[] = []

  if (canRunOpenAI) {
    modelsExecuted.push("openai/gpt-4o")
    tasks.push(
      generateText({
        model: "openai/gpt-4o",
        experimental_output: Output.object({ schema }),
        system,
        prompt,
      })
        .then((res) => ({ source: "openai", result: res.experimental_output }))
        .catch((err) => {
          console.warn("[SIE Consensus] OpenAI model execution warning:", err?.message)
          return { source: "openai", result: null }
        })
    )
  }

  if (canRunDeepSeek) {
    modelsExecuted.push("deepseek/deepseek-chat")
    tasks.push(
      generateText({
        model: "deepseek/deepseek-chat",
        experimental_output: Output.object({ schema }),
        system,
        prompt,
      })
        .then((res) => ({ source: "deepseek", result: res.experimental_output }))
        .catch((err) => {
          console.warn("[SIE Consensus] DeepSeek model execution warning:", err?.message)
          return { source: "deepseek", result: null }
        })
    )
  }

  const responses = await Promise.all(tasks)
  const validOutputs = responses.filter((r) => r.result !== null)

  if (validOutputs.length === 0) {
    // Ultimate fallback to default configured model
    const fallbackModel = primaryModel.includes("/") ? primaryModel : `openai/${primaryModel}`
    const { experimental_output } = await generateText({
      model: fallbackModel,
      experimental_output: Output.object({ schema }),
      system,
      prompt,
    })
    return experimental_output as z.infer<T>
  }

  if (validOutputs.length === 1) {
    return validOutputs[0].result
  }

  // Synthesize and merge multi-model outputs
  const [outA, outB] = [validOutputs[0].result, validOutputs[1].result]
  const mergedFindings: any[] = []

  const findingsA = Array.isArray(outA.findings) ? outA.findings : []
  const findingsB = Array.isArray(outB.findings) ? outB.findings : []

  // Check agreement between findings
  findingsA.forEach((fa: any) => {
    const match = findingsB.find(
      (fb: any) =>
        fb.category?.toLowerCase() === fa.category?.toLowerCase() ||
        fb.title?.toLowerCase().includes(fa.title?.toLowerCase()?.slice(0, 10))
    )

    if (match) {
      mergedFindings.push({
        ...fa,
        confidence: Math.min(0.99, Number((((fa.confidence || 0.8) + (match.confidence || 0.8)) / 2 + 0.1).toFixed(2))),
        models_agreeing: [validOutputs[0].source, validOutputs[1].source],
        consensus_score: 0.95,
      })
    } else {
      mergedFindings.push({
        ...fa,
        models_agreeing: [validOutputs[0].source],
        consensus_score: 0.75,
      })
    }
  })

  findingsB.forEach((fb: any) => {
    const alreadyIncluded = mergedFindings.some(
      (mf) =>
        mf.category?.toLowerCase() === fb.category?.toLowerCase() ||
        mf.title?.toLowerCase().includes(fb.title?.toLowerCase()?.slice(0, 10))
    )
    if (!alreadyIncluded) {
      mergedFindings.push({
        ...fb,
        models_agreeing: [validOutputs[1].source],
        consensus_score: 0.75,
      })
    }
  })

  return {
    repo_name: outA.repo_name || outB.repo_name,
    summary: outA.summary || outB.summary,
    findings: mergedFindings.slice(0, 8),
  } as z.infer<T>
}
