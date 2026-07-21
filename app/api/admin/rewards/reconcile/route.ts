import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const authRes = await supabase.auth.getUser()
  const user = authRes.data.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Aggregate settled rewards per agent
  const { data: sums, error: sumsError } = await (admin
    .from("rewards")
    .select("agent_id, sum(amount) as total") as any)
    .eq("status", "settled")
    .group("agent_id")

  if (sumsError) return NextResponse.json({ error: sumsError.message }, { status: 500 })
  if (!sums || sums.length === 0) return NextResponse.json({ reconciled: 0 })

  let updated = 0

  for (const row of sums) {
    const agentId = (row as any).agent_id
    const total = Number((row as any).total ?? 0)
    if (!agentId) continue

    try {
      // Read current agent total
      const { data: agentRow } = await admin.from("agents").select("total_earned").eq("id", agentId).maybeSingle()
      const current = Number(agentRow?.total_earned ?? 0)
      // If mismatch by more than a tiny epsilon, set to authoritative sum
      if (Math.abs(current - total) > 0.000001) {
        await admin.from("agents").update({ total_earned: total }).eq("id", agentId)
        updated++
      }
    } catch (err) {
      console.warn("Failed to reconcile agent total", { agentId, err })
    }
  }

  return NextResponse.json({ reconciled: updated })
}
