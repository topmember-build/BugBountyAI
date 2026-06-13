import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransactionStatus } from "@/lib/circle"

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
    .select("id, finding_id, external_id")
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

    reconciled++
  }

  return NextResponse.json({ reconciled })
}
