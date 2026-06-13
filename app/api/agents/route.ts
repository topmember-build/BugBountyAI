import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Public leaderboard of agents, ranked by total earnings.
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("agents")
    .select("id, slug, name, agent_type, description, avatar_seed, wallet_address, findings_count, total_earned, reputation")
    .order("total_earned", { ascending: false })
    .order("reputation", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agents: data ?? [] })
}
