import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getUserChallenge,
  createFeeTransferChallenge,
  getUserWallet,
  getUserUsdcBalance,
  createUserSession,
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

  let body: { transactionId?: string; challengeId?: string; userToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  let transactionId = body.transactionId?.trim() ?? null
  const challengeId = body.challengeId?.trim() ?? null
  let userToken = body.userToken?.trim() ?? null

  if (!transactionId && !challengeId) {
    return NextResponse.json(
      { error: "transactionId or challengeId is required" },
      { status: 400 },
    )
  }

  let newChallengeCreated = false
  let newChallenge: { challengeId: string; transactionId: string | null } | null = null

  if (!transactionId && challengeId) {
    if (!userToken) {
      return NextResponse.json(
        { error: "userToken is required when challengeId is provided" },
        { status: 400 },
      )
    }

    const challenge = await getUserChallenge(userToken, challengeId)
    if (!challenge) {
      console.warn("No fee challenge data returned during confirm", { challengeId })
      return NextResponse.json(
        { error: "Unable to fetch challenge state from Circle" },
        { status: 502 },
      )
    }

    console.log("Confirming fee challenge", {
      challengeId,
      status: challenge.status,
      correlationIds: challenge.correlationIds,
    })

    // If challenge is expired, create a new one
    if (challenge.status === "EXPIRED") {
      console.log("Challenge EXPIRED, creating new fee challenge", { userId: user.id, oldChallengeId: challengeId })
      
      try {
        const treasuryAddress = await getTreasuryAddress()
        if (!treasuryAddress) {
          return NextResponse.json(
            { error: "Treasury wallet address is not configured." },
            { status: 500 },
          )
        }

        // Get user session to fetch wallet and create new challenge
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

        if (!balance?.tokenId) {
          return NextResponse.json({ error: "USDC token ID not found for user wallet" }, { status: 400 })
        }

        const idempotencyKey = randomUUID()
        newChallenge = await createFeeTransferChallenge({
          userToken: session.userToken,
          walletId: wallet.walletId,
          tokenId: balance.tokenId,
          amount: FEE_AMOUNT,
          destinationAddress: treasuryAddress,
          idempotencyKey,
        })

        newChallengeCreated = true
        userToken = session.userToken // Update userToken for response

        console.log("Created new fee challenge to replace expired one", {
          userId: user.id,
          oldChallengeId: challengeId,
          newChallengeId: newChallenge.challengeId,
        })

        // Update fee row with new challenge ID
        const { error: updateError } = await admin
          .from("audit_fees")
          .update({ challenge_id: newChallenge.challengeId })
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .eq("status", "pending")

        if (updateError) {
          console.error("Failed to update fee row with new challenge ID", updateError)
        }

        // Return new challenge info so client can execute it
        return NextResponse.json({
          ok: true,
          appId: process.env.CIRCLE_APP_ID,
          userToken,
          encryptionKey: session.encryptionKey,
          challengeId: newChallenge.challengeId,
          transactionId: newChallenge.transactionId ?? null,
          status: "pending",
          newChallenge: true,
        })
      } catch (err) {
        console.error("Failed to create new fee challenge for expired challenge", err)
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to create new fee challenge" },
          { status: 500 },
        )
      }
    }

    transactionId = challenge.correlationIds?.[0] ?? null
  }

  const updatePayload: { status: "pending" | "authorized"; transaction_id?: string | null; challenge_id?: string | null } = {
    status: transactionId ? "authorized" : "pending",
  }
  if (transactionId) {
    updatePayload.transaction_id = transactionId
  }
  if (challengeId) {
    updatePayload.challenge_id = challengeId
  }

  let feeQuery = supabase
    .from("audit_fees")
    .select("id, status, transaction_id, challenge_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  if (challengeId) {
    feeQuery = feeQuery.eq("challenge_id", challengeId)
  } else if (transactionId) {
    feeQuery = feeQuery.eq("transaction_id", transactionId)
  }

  const { data: matchingRows, error: feeRowError } = await feeQuery

  if (feeRowError) {
    return NextResponse.json(
      { error: feeRowError.message ?? "Unable to look up fee record" },
      { status: 400 },
    )
  }

  const existingFeeRow = matchingRows?.find(
    (row) => row.status === "pending" || row.status === "authorized",
  )

  let feeRowId: string | null = null
  let updatedRow: { id: string; status: string; transaction_id: string | null } | null = null

  if (existingFeeRow) {
    const { data, error: updateError } = await admin
      .from("audit_fees")
      .update(updatePayload)
      .eq("id", existingFeeRow.id)
      .select("id, status, transaction_id")
      .single()

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "Unable to update fee authorization" },
        { status: 400 },
      )
    }

    feeRowId = data.id
    updatedRow = data
  } else {
    const { escrow, net } = computeEscrowBreakdown(BASE_FEE_AMOUNT)
    const { data: insertedRow, error: insertError } = await admin
      .from("audit_fees")
      .insert({
        user_id: user.id,
        challenge_id: challengeId ?? null,
        transaction_id: transactionId ?? null,
        amount: BASE_FEE_AMOUNT,
        escrow_fee: escrow,
        net_amount: net,
        status: updatePayload.status,
      })
      .select("id, status, transaction_id")
      .single()

    if (insertError || !insertedRow) {
      return NextResponse.json(
        { error: insertError?.message ?? "Unable to create fee authorization record" },
        { status: 400 },
      )
    }

    feeRowId = insertedRow.id
    updatedRow = insertedRow
  }

  return NextResponse.json({
    ok: true,
    transactionId: updatedRow.transaction_id ?? null,
    status: updatedRow.status,
    feeRowId,
  })
}
