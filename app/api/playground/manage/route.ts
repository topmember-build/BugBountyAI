import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SEED_COMPETITIONS } from "@/lib/playground-data"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const hostCode = searchParams.get("host_code")
    const adminCode = searchParams.get("admin_code")

    const supabase = await createClient()
    let competitions = SEED_COMPETITIONS

    if (supabase) {
      const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false })
      if (data && data.length > 0) {
        competitions = data
      }
    }

    const now = Date.now()

    const manageData = competitions.map((comp: any) => {
      const sprintStartDate = new Date(comp.sprint_start_date || comp.start_date || now).getTime()
      const endDate = new Date(comp.end_date || (sprintStartDate + 7 * 86400000)).getTime()
      const judgingEndDate = new Date(comp.judging_end_date || (endDate + 3 * 86400000)).getTime()
      const payoutReleaseDate = new Date(comp.payout_release_date || (judgingEndDate + 3 * 86400000)).getTime()

      let lifecyclePhase = "active_sprint"
      if (comp.status === "pending_approval") {
        lifecyclePhase = "pending_approval"
      } else if (comp.status === "declined") {
        lifecyclePhase = "declined"
      } else if (now < sprintStartDate) {
        lifecyclePhase = "registration_open"
      } else if (now >= sprintStartDate && now < endDate) {
        lifecyclePhase = "sprint_active"
      } else if (now >= endDate && now < judgingEndDate) {
        lifecyclePhase = "judging_cooldown"
      } else if (now >= judgingEndDate && now < payoutReleaseDate) {
        lifecyclePhase = "escrow_cooldown"
      } else {
        lifecyclePhase = "ready_for_payout"
      }

      return {
        ...comp,
        lifecycle_phase: lifecyclePhase,
        pending_payout_usdc: comp.status === "completed" ? comp.prize_pool_usdc : 0,
        total_submissions: comp.participants_count || 0,
        escrow_verified: true,
      }
    })

    return NextResponse.json({
      success: true,
      competitions: manageData,
      stats: {
        total_hosted: manageData.length,
        total_escrow_locked_usdc: manageData.reduce((acc: number, c: any) => acc + c.prize_pool_usdc, 0),
        active_sprints: manageData.filter((c: any) => c.status === "active").length,
        pending_payouts: manageData.filter((c: any) => c.status === "completed").length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch manage data" }, { status: 500 })
  }
}
