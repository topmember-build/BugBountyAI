import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createCircleUser,
  createUserSession,
  createFeeTransferChallenge,
  getUserWallet,
  getUserUsdcBalance,
} from "@/lib/circle-user"
import { getTreasuryAddress } from "@/lib/circle"
import { computeEscrowBreakdown } from "@/lib/fees"

const BASE_FEE_AMOUNT = Number(process.env.AUDIT_FEE_USDC ?? "1")
const FEE_AMOUNT = BASE_FEE_AMOUNT

export async function POST(request: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const treasuryAddress = await getTreasuryAddress()
  if (!treasuryAddress) {
    return NextResponse.json(
      { error: "Treasury wallet address is not configured." },
      { status: 500 },
    )
  }

  try {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)
    const wallet = await getUserWallet(session.userToken)

    if (!wallet) {
      return NextResponse.json(
        { error: "User wallet is not set up yet. Complete wallet setup first." },
        { status: 400 },
      )
    }

    const balance = await getUserUsdcBalance(session.userToken, wallet.walletId)
    const amount = Number(balance.amount)
    if (amount < FEE_AMOUNT) {
      return NextResponse.json(
        { error: `Insufficient wallet USDC balance. Fund your wallet with at least ${FEE_AMOUNT} USDC.` },
        { status: 400 },
      )
    }

    const idempotencyKey = randomUUID()

    if (!balance?.tokenId) {
      console.error("Missing tokenId for user wallet when creating fee challenge", { userId: user.id })
      return NextResponse.json({ error: "USDC token ID not found for user wallet" }, { status: 400 })
    }

    let challenge
    try {
      challenge = await createFeeTransferChallenge({
        userToken: session.userToken,
        walletId: wallet.walletId,
        tokenId: balance.tokenId,
        amount: FEE_AMOUNT,
        destinationAddress: treasuryAddress,
        idempotencyKey,
      })
    } catch (err) {
      // Log full error object when available for debugging the Circle SDK parameter issue
      try {
        console.error("createFeeTransferChallenge failed", {
          userId: user.id,
          walletId: wallet.walletId,
          tokenId: balance.tokenId,
          amount: FEE_AMOUNT,
          destinationAddress: treasuryAddress,
          idempotencyKey,
          error: err instanceof Error ? err.message : err,
        })
      } catch (logErr) {
        console.error("Failed to log createFeeTransferChallenge error", logErr)
      }

      return NextResponse.json({ error: `Circle createTransaction failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 })
    }

    // Persist fee attempt server-side for reconciliation and audit locking
    try {
      const { escrow, net } = computeEscrowBreakdown(BASE_FEE_AMOUNT)
      await admin.from("audit_fees").insert({
        user_id: user.id,
        transaction_id: challenge.transactionId ?? null,
        challenge_id: challenge.challengeId ?? null,
        idempotency_key: idempotencyKey,
        amount: BASE_FEE_AMOUNT,
        escrow_fee: escrow,
        net_amount: net,
        source_address: wallet.address,
        status: "pending",
      })
    } catch (dbErr) {
      // non-fatal: still return challenge payload but log server-side
      console.error("Failed to persist audit fee attempt:", dbErr)
    }

    return NextResponse.json({
      appId: process.env.CIRCLE_APP_ID,
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
      challengeId: challenge.challengeId,
      transactionId: challenge.transactionId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to create fee transfer challenge" },
      { status: 500 },
    )
  }
}
