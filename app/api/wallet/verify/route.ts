import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCircleUser, createUserSession, getUserTransaction } from "@/lib/circle-user"
import { notifyContractDeposit } from "@/lib/escrow-contract"
import { getTransactionStatus, transferFromDeveloperWallet, getTreasuryAddress } from "@/lib/circle"
import { randomUUID } from "crypto"

// POST /api/wallet/verify — verify a user-wallet transaction state
export async function POST(request: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { userToken?: string; transactionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  let userToken = body.userToken?.trim() ?? null
  const transactionId = body.transactionId?.trim() ?? null
  if (!transactionId) return NextResponse.json({ error: "transactionId is required" }, { status: 400 })

  if (!userToken) {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)
    userToken = session.userToken
  }

  let tx = await getUserTransaction(userToken, transactionId)
  let state = tx?.state ?? null
  let txHash = tx?.txHash ?? null

  if (!state || state === "unknown") {
    const devStatus = await getTransactionStatus(transactionId)
    if (devStatus) {
      state = devStatus.status === "settled" ? "COMPLETE" : devStatus.status === "failed" ? "FAILED" : "PENDING"
      txHash = devStatus.txHash
    }
  }

  if (!state) return NextResponse.json({ status: "unknown" })

  const settledStates = new Set(["COMPLETE", "CONFIRMED", "settled", "SETTLED"])

  if (settledStates.has(String(state))) {
    try {
      const { data: feeRow } = await admin
        .from("audit_fees")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle()

      if (feeRow) {
        if (feeRow.status === "settled") {
          // If already settled, return COMPLETE
          return NextResponse.json({ status: "COMPLETE", txHash: feeRow.refund_tx_hash || txHash })
        }

        // If User -> Dev transaction is COMPLETE, but we haven't started Dev -> Contract yet
        if (!feeRow.refund_external_id) {
          const treasuryAddress = await getTreasuryAddress()
          if (!treasuryAddress) {
            return NextResponse.json({ error: "Escrow contract address not configured" }, { status: 500 })
          }

          console.log("[bridge] User -> Dev tx complete, initiating Dev -> Contract transfer", {
            amount: feeRow.amount,
            destinationAddress: treasuryAddress,
          })

          const transferResult = await transferFromDeveloperWallet({
            destinationAddress: treasuryAddress,
            amount: Number(feeRow.amount ?? 1),
            idempotencyKey: randomUUID(),
          })

          if (transferResult.transactionId) {
            await admin
              .from("audit_fees")
              .update({ refund_external_id: transferResult.transactionId })
              .eq("id", feeRow.id)

            return NextResponse.json({ status: "PENDING", txHash: null })
          } else {
            console.error("[bridge] Dev -> Contract transfer failed to initiate:", transferResult.error)
            return NextResponse.json({ status: "FAILED", error: transferResult.error })
          }
        } else {
          // If we already initiated the Dev -> Contract transfer, check its status
          const devStatus = await getTransactionStatus(feeRow.refund_external_id)
          if (devStatus) {
            console.log("[bridge] Dev -> Contract tx state check:", devStatus.status)
            if (devStatus.status === "settled") {
              await admin
                .from("audit_fees")
                .update({ status: "settled", refund_tx_hash: devStatus.txHash })
                .eq("id", feeRow.id)

              if (feeRow.source_address) {
                const depositResult = await notifyContractDeposit({
                  auditUuid: feeRow.id,
                  depositor: feeRow.source_address,
                  amount: Number(feeRow.amount ?? 1),
                })
                if (depositResult.error) {
                  console.warn("[escrow] verify: notifyContractDeposit failed (non-fatal)", depositResult.error)
                }
              }
              return NextResponse.json({ status: "COMPLETE", txHash: devStatus.txHash })
            } else if (devStatus.status === "failed") {
              await admin.from("audit_fees").update({ status: "failed" }).eq("id", feeRow.id)
              return NextResponse.json({ status: "FAILED" })
            } else {
              return NextResponse.json({ status: "PENDING", txHash: null })
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed in bridge transfer verify:", err)
      return NextResponse.json({ status: "PENDING", txHash: null })
    }
  }

  return NextResponse.json({ status: state, txHash })
}

