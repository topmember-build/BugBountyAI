import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTransactionStatus } from "@/lib/circle"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const authRes = await supabase.auth.getUser()
  const user = authRes.data.user
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Find refunded rows with an external id that may still be settling
  const { data: rows, error } = await admin
    .from("audit_fees")
    .select("id, refund_external_id, status")
    .eq("status", "refunded")
    .not("refund_external_id", "is", null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ reconciled: 0 })

  let reconciled = 0

  for (const r of rows) {
    try {
      const tx = await getTransactionStatus((r as any).refund_external_id as string)
      if (!tx || tx.status === "settling") continue

      const updatePayload: any = {
        refunded_at: tx.status === "settled" ? new Date().toISOString() : null,
        refund_tx_hash: tx.txHash,
        status: tx.status === "settled" ? "refunded" : "refund_failed",
      }

      await admin.from("audit_fees").update(updatePayload).eq("id", r.id)
      reconciled++
    } catch (err) {
      console.warn("Failed to reconcile refund", { feeId: r.id, err })
    }
  }

  return NextResponse.json({ reconciled })
}
