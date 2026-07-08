import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createUserSession, getUserWallet, requestCircleTestnetUsdcFaucet } from "@/lib/circle-user"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsedCooldownSeconds = Number(process.env.FAUCET_COOLDOWN_SECONDS ?? "43200")
  const cooldownSeconds = Number.isFinite(parsedCooldownSeconds) && parsedCooldownSeconds > 0 ? parsedCooldownSeconds : 43200
  const now = Date.now()

  let cooldownRow: { last_claimed_at: string | null } | null = null
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from("faucet_cooldowns").select("last_claimed_at").eq("user_id", user.id).maybeSingle()
    if (!error) cooldownRow = data
  } catch {
    cooldownRow = null
  }

  const lastClaimedAt = cooldownRow?.last_claimed_at ? Date.parse(cooldownRow.last_claimed_at) : null
  if (lastClaimedAt && now - lastClaimedAt < cooldownSeconds * 1000) {
    const remaining = Math.ceil((cooldownSeconds * 1000 - (now - lastClaimedAt)) / 1000)
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    return NextResponse.json({ error: `Cooldown active • Try again in ${timeStr}`, cooldown: remaining }, { status: 429 })
  }

  let address: string | null = null

  // Try to read a stored user wallet address first, but allow the caller to
  // provide an explicit address/network payload for the backend faucet call.
  try {
    const body = await request.json().catch(() => null)
    const requestedAddress = typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null
    const requestedNetwork = typeof body?.network === "string" && body.network.trim() ? body.network.trim() : undefined

    const { data: walletRow, error } = await supabase.from("user_wallets").select("address").eq("user_id", user.id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    address = requestedAddress ?? walletRow?.address ?? null

    // If no address saved, attempt to query Circle via a short-lived user token
    if (!address) {
      try {
        const { userToken } = await createUserSession(user.id)
        const walletInfo = await getUserWallet(userToken)
        if (!walletInfo || !walletInfo.address) {
          return NextResponse.json({ error: "No user wallet found. Please set up your wallet first." }, { status: 400 })
        }
        address = walletInfo.address
        // Persist for future calls
        await supabase.from("user_wallets").upsert({ user_id: user.id, address })
      } catch (err) {
        return NextResponse.json({ error: "Unable to fetch user wallet from Circle." }, { status: 500 })
      }
    }

    const result = await requestCircleTestnetUsdcFaucet(address, requestedNetwork)

    if (result.error) {
      return NextResponse.json(
        {
          status: "unavailable",
          provider: "circle_testnet_faucet",
          simulated: true,
          message: result.reason ?? result.error,
          error: result.error,
        },
        { status: 503 },
      )
    }

    try {
      const admin = createAdminClient()
      await admin.from("faucet_cooldowns").upsert({
        user_id: user.id,
        last_claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error("Failed to persist faucet cooldown", err)
    }

    return NextResponse.json({
      status: result.simulated ? "simulated" : "requested",
      provider: "circle_testnet_faucet",
      simulated: result.simulated,
      message: result.simulated ? "Faucet request successful • 1 USDC sent" : "Faucet request successful • 1 USDC sent",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error"
    console.error("Faucet request failed", {
      error: message,
      userId: user.id,
      address,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
