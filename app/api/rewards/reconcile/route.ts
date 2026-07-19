import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransactionStatus } from "@/lib/circle"
import { updateAgentReputation } from "@/lib/agent-identity"

/**
 * Reconcile rewards stuck in "settling" with their on-chain state via Circle.
 * Scoped to the authenticated user's rewards.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: settling, error } = await supabase
    .from("rewards")
    .select("id, finding_id, external_id, agent_id, amount")
    .eq("user_id", user.id)
    .eq("status", "settling")
    .not("external_id", "is", null)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!settling || settling.length === 0) {
    return NextResponse.json({ reconciled: 0 })
  }

  const admin = createAdminClient()
  let reconciled = 0

  for (const reward of settling) {
    const tx = await getTransactionStatus(reward.external_id as string)
    if (!tx || tx.status === "settling") continue

    await admin
      .from("rewards")
      .update({
        status: tx.status,
        tx_hash: tx.txHash,
        settled_at: tx.status === "settled" ? new Date().toISOString() : null,
      })
      .eq("id", reward.id)

    await admin.from("findings").update({ reward_status: tx.status }).eq("id", reward.finding_id)

    if (tx.status === "settled") {
      const { data: findingRow } = await admin.from("findings").select("severity").eq("id", reward.finding_id).maybeSingle()
      const { data: agentRow } = await admin
        .from("agents")
        .select("onchain_agent_id, onchain_registry_address")
        .eq("id", reward.agent_id)
        .maybeSingle()

      // Increment on-chain reputation and update leaderboard stats for settled rewards
      await updateAgentReputation({
        agentId: agentRow?.onchain_agent_id ?? null,
        registryAddress: agentRow?.onchain_registry_address ?? null,
        delta: severityReputation(findingRow?.severity ?? "low"),
      })

      // Ensure agents.total_earned and findings_count are incremented for rewards
      // that completed settlement while previously being in a "settling" state.
      if (reward.agent_id && reward.amount) {
        try {
          await admin.rpc("increment_agent_stats", {
            p_agent_id: reward.agent_id,
            p_earned: Number(reward.amount),
            p_reputation: severityReputation(findingRow?.severity ?? "low"),
          })
        } catch (err) {
          console.warn("Failed to rpc increment_agent_stats during reward reconciliation", { err })
        }
      }
    }

    reconciled++
  }

  return NextResponse.json({ reconciled })
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
