import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Public, aggregated platform metrics for the live counters.
export async function GET() {
  const supabase = createAdminClient()

  const [auditsRes, findingsRes, rewardsRes, agentsRes] = await Promise.all([
    supabase.from("audits").select("id", { count: "exact", head: true }),
    supabase.from("findings").select("id", { count: "exact", head: true }),
    supabase.from("rewards").select("amount").eq("status", "settled"),
    supabase.from("agents").select("id", { count: "exact", head: true }),
  ])

  const totalSettled = (rewardsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount ?? 0),
    0,
  )

  return NextResponse.json({
    auditsCompleted: auditsRes.count ?? 0,
    findingsDiscovered: findingsRes.count ?? 0,
    usdcDistributed: Number(totalSettled.toFixed(2)),
    activeAgents: agentsRes.count ?? 0,
  })
}
