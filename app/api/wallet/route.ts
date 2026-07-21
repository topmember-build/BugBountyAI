import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createCircleUser,
  createUserSession,
  getCircleUserStatus,
  getUserChallenge,
  getUserWallet,
  getUserUsdcBalance,
} from "@/lib/circle-user"
import { computeEscrowBreakdown } from "@/lib/fees"

const BASE_FEE_AMOUNT = Number(process.env.AUDIT_FEE_USDC ?? "1")
const FEE_AMOUNT = BASE_FEE_AMOUNT
const APP_ID = process.env.CIRCLE_APP_ID ?? null

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const configured = Boolean(APP_ID && process.env.CIRCLE_API_KEY)
  if (!configured) {
    return NextResponse.json({
      configured: false,
      appId: APP_ID,
      status: null,
      wallet: null,
      balance: null,
      feeAmount: FEE_AMOUNT,
    })
  }

  try {
    try {
      await createCircleUser(user.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Circle user creation error"
      console.error("Circle user creation failed:", message)
      return NextResponse.json({ error: `Circle user creation failed: ${message}` }, { status: 502 })
    }

    let session
    try {
      session = await createUserSession(user.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Circle session creation error"
      console.error("Circle session creation failed:", message)
      return NextResponse.json({ error: `Circle session creation failed: ${message}` }, { status: 502 })
    }

    const status = await getCircleUserStatus(session.userToken)

    let wallet
    try {
      wallet = await getUserWallet(session.userToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown Circle wallet fetch error"
      console.error("Circle wallet fetch failed:", message)
      return NextResponse.json({ error: `Circle wallet fetch failed: ${message}` }, { status: 502 })
    }

    let balance = null
    if (wallet) {
      try {
        balance = await getUserUsdcBalance(session.userToken, wallet.walletId)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Circle balance fetch error"
        console.error("Circle balance fetch failed:", message)
        return NextResponse.json({ error: `Circle balance fetch failed: ${message}` }, { status: 502 })
      }
    }

    const { data: feeAuthorizedRows } = await admin
      .from("audit_fees")
      .select("id, transaction_id")
      .eq("user_id", user.id)
      .in("status", ["authorized", "pending"])
      .not("transaction_id", "is", null)
      .order("created_at", { ascending: false })

    let feeTransactionId: string | null = null
    for (const row of feeAuthorizedRows || []) {
      if (!row.transaction_id) continue
      const { data: linkedAudit } = await admin
        .from("audits")
        .select("id")
        .eq("audit_fee_id", row.id)
        .maybeSingle()

      if (!linkedAudit) {
        feeTransactionId = row.transaction_id
        break
      }
    }

    const { data: feePendingRows } = await admin
      .from("audit_fees")
      .select("challenge_id")
      .eq("user_id", user.id)
      .in("status", ["pending", "authorized"])
      .is("transaction_id", null)
      .order("created_at", { ascending: false })
      .limit(1)

    const pendingChallengeId = feePendingRows?.[0]?.challenge_id ?? null

    if (!feeTransactionId && pendingChallengeId) {
      try {
        const challenge = await getUserChallenge(session.userToken, pendingChallengeId)
        if (challenge) {
          console.log("Pending fee challenge status", {
            challengeId: pendingChallengeId,
            status: challenge.status,
            correlationIds: challenge.correlationIds,
          })
        } else {
          console.log("No fee challenge returned for pending challenge", {
            challengeId: pendingChallengeId,
          })
        }

        feeTransactionId = challenge?.correlationIds?.[0] ?? null
        if (feeTransactionId) {
          const { error: updateError } = await admin
            .from("audit_fees")
            .update({ transaction_id: feeTransactionId, status: "authorized" })
            .eq("user_id", user.id)
            .eq("challenge_id", pendingChallengeId)
            .eq("status", "pending")

          if (updateError) {
            console.error("Failed to update pending fee challenge to authorized", updateError)
          }
        }
      } catch (err) {
        console.warn("Unable to resolve pending fee transaction from challenge", err)
      }
    }

    return NextResponse.json({
      configured: true,
      appId: APP_ID,
      status,
      wallet,
      balance,
      feeAmount: FEE_AMOUNT,
      feeTransactionId,
      pendingChallengeId,
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch Circle wallet data"
    console.error("Unhandled wallet route error:", message)
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    )
  }
}
