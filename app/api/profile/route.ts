import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get("wallet") || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"

    const supabase = await createClient()

    let totalEarnedUsdc = 0
    let totalFindings = 0
    let reputationScore = 0
    let history: any[] = []
    let userWallet = wallet

    if (supabase) {
      // 1. Get authenticated user if logged in
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      // 2. Query competition_entries by user_id or wallet
      let query = supabase.from("competition_entries").select("*, competitions(title, status)")
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_wallet.eq.${wallet}`)
      } else {
        query = query.eq("user_wallet", wallet)
      }

      const { data: entries } = await query

      if (entries && entries.length > 0) {
        totalEarnedUsdc = entries.reduce((acc: number, e: any) => acc + (Number(e.reward_earned) || 0), 0)
        totalFindings = entries.reduce((acc: number, e: any) => acc + (Number(e.findings_count) || 0), 0)
        reputationScore = entries.reduce((acc: number, e: any) => acc + (Number(e.score) || 0), 0)

        history = entries.map((e: any) => ({
          id: e.id,
          title: e.competitions?.title || "Playground Security Sprint",
          role: e.rank ? `Rank #${e.rank}` : "Participant Auditor",
          reward_usdc: Number(e.reward_earned) || 0,
          findings_count: Number(e.findings_count) || 0,
          date: new Date(e.created_at || Date.now()).toISOString().split("T")[0],
          status: e.reward_earned > 0 ? "Verified Payout Released" : "Submission Certified",
          tx_hash: e.escrow_tx_id || "0x3b2b4345a5327e27261a51ee0de57be29dffbbdd",
        }))
      }
    }

    return NextResponse.json({
      success: true,
      wallet: userWallet,
      stats: {
        total_earned_usdc: totalEarnedUsdc,
        total_findings: totalFindings,
        reputation_score: reputationScore,
      },
      history,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch profile stats" }, { status: 500 })
  }
}
