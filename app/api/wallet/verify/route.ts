import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCircleUser, createUserSession, getUserTransaction } from "@/lib/circle-user"

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

  const tx = await getUserTransaction(userToken, transactionId)
  if (!tx) return NextResponse.json({ status: "unknown" })

  // Mark audit_fees row settled when transaction reaches a final state
  const settledStates = new Set(["COMPLETE", "CONFIRMED", "settled", "SETTLED"])
  if (settledStates.has(String(tx.state))) {
    try {
      await admin
        .from("audit_fees")
        .update({ status: "settled", transaction_id: transactionId })
        .eq("transaction_id", transactionId)
    } catch (err) {
      console.error("Failed to update audit_fees status:", err)
    }
  }

  return NextResponse.json({ status: tx.state, txHash: tx.txHash })
}
