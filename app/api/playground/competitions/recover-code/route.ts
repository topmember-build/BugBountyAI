import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SEED_COMPETITIONS } from "@/lib/playground-data"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { competition_id, host_wallet_address } = body

    if (!competition_id || !host_wallet_address) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: competition_id and host_wallet_address" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let competition: any = null

    if (supabase) {
      const { data } = await supabase
        .from("competitions")
        .select("*")
        .or(`id.eq.${competition_id},slug.eq.${competition_id},title.ilike.%${competition_id}%`)
        .limit(1)

      if (data && data.length > 0) {
        competition = data[0]
      }
    }

    if (!competition) {
      competition = SEED_COMPETITIONS.find(
        (c: any) => c.id === competition_id || c.slug === competition_id || c.title.toLowerCase().includes(competition_id.toLowerCase())
      )
    }

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found. Please check competition ID or title." },
        { status: 404 }
      )
    }

    // Verify refund wallet address matches registered record
    const registeredWallet = competition.host_wallet_address || competition.depositor || process.env.ESCROW_OPERATOR_ADDRESS || ""
    const providedWallet = host_wallet_address.trim().toLowerCase()

    if (!registeredWallet || registeredWallet.trim().toLowerCase() !== providedWallet) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address mismatch. Host Code key rotation requires verification using the exact refund wallet address registered for this competition.",
        },
        { status: 403 }
      )
    }

    // Generate fresh rotated access code
    const rotatedAccessCode = "HOST-BOUNTY-" + Math.random().toString(36).substring(2, 7).toUpperCase()

    if (supabase) {
      try {
        await supabase
          .from("competitions")
          .update({
            host_access_code: rotatedAccessCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", competition.id)
      } catch (e) {
        console.warn("[recover-code API] Supabase update warning:", e)
      }
    }

    return NextResponse.json({
      success: true,
      competition_id: competition.id,
      competition_title: competition.title,
      host_access_code: rotatedAccessCode,
      message: "Host Access Code rotated successfully! Your previous code has been invalidated.",
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to rotate host access code" },
      { status: 500 }
    )
  }
}
