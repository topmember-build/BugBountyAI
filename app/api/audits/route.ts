import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeRepository } from "@/lib/analyzer"
import { calculateReward } from "@/lib/rewards"
import { settleReward } from "@/lib/circle"
import { createCircleUser, createUserSession, getUserTransaction } from "@/lib/circle-user"
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

  const contentType = request.headers.get("content-type") || ""
  let body: { repo_url?: string; branch?: string; agents?: AgentType[]; fee_transaction_id?: string; archive_path?: string; archive_filename?: string }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    body = {
      repo_url: formData.get("repo_url") as string | undefined,
      branch: formData.get("branch") as string | undefined,
      fee_transaction_id: formData.get("fee_transaction_id") as string | undefined,
      archive_path: formData.get("archive_path") as string | undefined,
      archive_filename: formData.get("archive_filename") as string | undefined,
    }
  } else {
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
  }

  const repoUrl = body.repo_url?.trim()
  if (!repoUrl) {
    return NextResponse.json({ error: "repo_url is required" }, { status: 400 })
  }

  const feeTransactionId = body.fee_transaction_id?.trim()
  if (!feeTransactionId) {
    return NextResponse.json({ error: "fee_transaction_id is required" }, { status: 400 })
  }

  const { data: feeRow, error: feeError } = await supabase
    .from("audit_fees")
    .select("status")
    .eq("user_id", user.id)
    .eq("transaction_id", feeTransactionId)
    .in("status", ["authorized", "settled"])
    .single()

  if (feeError || !feeRow) {
    return NextResponse.json(
      { error: "A valid authorized audit fee transaction is required." },
      { status: 400 },
    )
  }

  try {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)
    const tx = await getUserTransaction(session.userToken, feeTransactionId)

    const settledStates = new Set(["COMPLETE", "CONFIRMED", "SETTLED", "settled"])
    if (!tx || !settledStates.has(String(tx.state))) {
      return NextResponse.json(
        {
          error: `Fee transaction must be settled before submitting an audit. Current state: ${tx?.state ?? "unknown"}`,
        },
        { status: 400 },
      )
    }

    if (feeRow.status !== "settled") {
      await supabase
        .from("audit_fees")
        .update({ status: "settled" })
        .eq("user_id", user.id)
        .eq("transaction_id", feeTransactionId)
    }
  } catch (verifyError) {
    return NextResponse.json(
      { error: verifyError instanceof Error ? verifyError.message : "Unable to verify fee transaction" },
      { status: 502 },
    )
  }

  const { error: markUsedError } = await supabase
    .from("audit_fees")
    .update({ status: "used" })
    .eq("user_id", user.id)
    .eq("transaction_id", feeTransactionId)
    .eq("status", feeRow.status)

  if (markUsedError) {
    return NextResponse.json(
      { error: "Unable to consume the audit fee transaction." },
      { status: 500 },
    )
  }

  const branch = body.branch?.trim() || "main"

  // 1. Create the audit row (status: scanning)
  const auditPayload: Record<string, unknown> = {
    user_id: user.id,
    repo_url: repoUrl,
    branch,
    status: "scanning",
  }

  if (body.archive_path) {
    auditPayload.archive_path = body.archive_path
    auditPayload.archive_uploaded_at = new Date().toISOString()
  }

  if (body.archive_filename) {
    auditPayload.archive_filename = body.archive_filename
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert(auditPayload)
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
