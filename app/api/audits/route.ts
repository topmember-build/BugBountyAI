import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeRepository } from "@/lib/analyzer"
import { calculateReward } from "@/lib/rewards"
import { settleReward } from "@/lib/circle"
import type { AgentType } from "@/lib/types"

export const maxDuration = 120

// GET /api/audits — list the current user's audits
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("audits")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audits: data })
}

// POST /api/audits — submit a repo, run the AI swarm, store findings, settle rewards
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { repo_url?: string; branch?: string; agents?: AgentType[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const repoUrl = body.repo_url?.trim()
  if (!repoUrl) {
    return NextResponse.json({ error: "repo_url is required" }, { status: 400 })
  }

  const branch = body.branch?.trim() || "main"

  // 1. Create the audit row (status: scanning)
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      user_id: user.id,
      repo_url: repoUrl,
      branch,
      status: "scanning",
    })
    .select()
    .single()

  if (auditError || !audit) {
    return NextResponse.json(
      { error: auditError?.message ?? "Failed to create audit" },
      { status: 500 },
    )
  }

  try {
    // 2. Run the AI audit swarm
    const analysis = await analyzeRepository({
      repoUrl,
      branch,
      selectedAgents: body.agents,
    })

    // 3. Map agent_type -> agent row (for attribution + leaderboard updates)
    const admin = createAdminClient()
    const { data: agents } = await admin
      .from("agents")
      .select("id, slug, agent_type")

    const agentByType = new Map<string, { id: string }>()
    for (const a of agents ?? []) {
      if (!agentByType.has(a.agent_type)) agentByType.set(a.agent_type, { id: a.id })
    }

    // 4. Build findings with calculated USDC rewards
    let totalReward = 0
    const findingsToInsert = analysis.findings.map((f) => {
      const reward = calculateReward(f.severity, f.confidence)
      totalReward += reward
      return {
        audit_id: audit.id,
        user_id: user.id,
        agent_id: agentByType.get(f.agent_type)?.id ?? null,
        title: f.title,
        severity: f.severity,
        confidence: f.confidence,
        category: f.category,
        file_path: f.file_path,
        line_start: f.line_start || null,
        line_end: f.line_end || null,
        description: f.description,
        recommendation: f.recommendation,
        reward_amount: reward,
        reward_status: "pending" as const,
      }
    })

    const { data: insertedFindings, error: findingsError } = await supabase
      .from("findings")
      .insert(findingsToInsert)
      .select()

    if (findingsError) {
      throw new Error(findingsError.message)
    }

    // 5. Settle rewards via Circle/Arc and record them
    for (const finding of insertedFindings ?? []) {
      if (Number(finding.reward_amount) <= 0) continue

      const agentRow = (agents ?? []).find((a) => a.id === finding.agent_id)
      const { data: agentWallet } = await admin
        .from("agents")
        .select("wallet_address")
        .eq("id", finding.agent_id)
        .maybeSingle()

      const destination =
        agentWallet?.wallet_address ?? "0x0000000000000000000000000000000000000000"

      const settlement = await settleReward({
        amount: Number(finding.reward_amount),
        destinationAddress: destination,
        // Circle requires idempotency keys to be UUIDs; the finding id already is one.
        idempotencyKey: finding.id,
      })

      await supabase
        .from("findings")
        .update({ reward_status: settlement.status })
        .eq("id", finding.id)

      await admin.from("rewards").insert({
        finding_id: finding.id,
        user_id: user.id,
        agent_id: finding.agent_id,
        amount: finding.reward_amount,
        status: settlement.status,
        provider: settlement.provider,
        tx_hash: settlement.txHash,
        external_id: settlement.externalId,
        settled_at: settlement.status === "settled" ? new Date().toISOString() : null,
      })

      // 6. Update agent leaderboard stats
      if (finding.agent_id && agentRow) {
        await admin.rpc("increment_agent_stats", {
          p_agent_id: finding.agent_id,
          p_earned: Number(finding.reward_amount),
          p_reputation: severityReputation(finding.severity),
        })
      }
    }

    // 7. Finalize the audit
    const { data: finalAudit } = await supabase
      .from("audits")
      .update({
        status: "completed",
        repo_name: analysis.repoName,
        findings_count: insertedFindings?.length ?? 0,
        total_reward: totalReward,
        completed_at: new Date().toISOString(),
      })
      .eq("id", audit.id)
      .select()
      .single()

    return NextResponse.json({
      audit: finalAudit ?? audit,
      summary: analysis.summary,
      findings_count: insertedFindings?.length ?? 0,
      total_reward: totalReward,
    })
  } catch (err) {
    await supabase.from("audits").update({ status: "failed" }).eq("id", audit.id)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 },
    )
  }
}

function severityReputation(severity: string): number {
  switch (severity) {
    case "critical":
      return 40
    case "high":
      return 25
    case "medium":
      return 12
    case "low":
      return 5
    default:
      return 1
  }
}
