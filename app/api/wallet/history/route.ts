import "server-only"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createCircleUser, createUserSession, getUserTransaction } from "@/lib/circle-user"

interface HistoryItem {
  id: string
  kind: "audit_fee" | "agent_payout"
  title: string
  createdAt: string | null
  amount: number
  status: string
  detail: string
  txId: string | null
  txHash: string | null
  provider: string | null
}

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)

    const { data: feeRows, error: feeError } = await admin
      .from("audit_fees")
      .select("id, created_at, amount, net_amount, status, transaction_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (feeError) {
      throw new Error(feeError.message)
    }

    const feeItems: HistoryItem[] = await Promise.all(
      (feeRows ?? []).map(async (row) => {
        let circleStatus = row.status ?? "pending"
        let txHash: string | null = null

        if (row.transaction_id) {
          const tx = await getUserTransaction(session.userToken, row.transaction_id)
          if (tx) {
            const normalized = tx.state?.toUpperCase() ?? ""
            circleStatus = normalized.includes("COMPLETE") || normalized.includes("SETTLED") || normalized.includes("SUCCESS")
              ? "settled"
              : normalized.includes("PENDING") || normalized.includes("PROCESS")
                ? "pending"
                : row.status ?? "pending"
            txHash = tx.txHash ?? null
          }
        }

        return {
          id: `fee-${row.id}`,
          kind: "audit_fee" as const,
          title: "Audit fee payment",
          createdAt: row.created_at,
          amount: Number(row.amount ?? row.net_amount ?? 0),
          status: circleStatus,
          detail: `Fee payment to ${row.status ?? "process"}`,
          txId: row.transaction_id ?? null,
          txHash,
          provider: "Circle user wallet",
        }
      }),
    )

    const { data: rewardRows, error: rewardError } = await admin
      .from("rewards")
      .select("id, created_at, amount, status, provider, tx_hash, external_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (rewardError) {
      throw new Error(rewardError.message)
    }

    const rewardItems: HistoryItem[] = (rewardRows ?? []).map((row) => ({
      id: `reward-${row.id}`,
      kind: "agent_payout" as const,
      title: "Agent payout",
      createdAt: row.created_at,
      amount: Number(row.amount ?? 0),
      status: row.status ?? "pending",
      detail: row.provider ?? "Reward settlement",
      txId: row.external_id ?? null,
      txHash: row.tx_hash ?? null,
      provider: row.provider ?? null,
    }))

    const items = [...feeItems, ...rewardItems].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return right - left
    })

    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load payment history"
    console.error("wallet history error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
