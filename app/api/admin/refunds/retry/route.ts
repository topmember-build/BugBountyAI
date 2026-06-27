import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { refundFee } from "@/lib/circle"
import { createCircleUser, createUserSession, getUserWallet } from "@/lib/circle-user"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()
  // Require an authorized admin user. Admin emails are configured via
  // the `ADMIN_EMAILS` env var (comma-separated). This avoids an open
  // admin endpoint in production.
  const authRes = await supabase.auth.getUser()
  const user = authRes.data.user
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { feeIds?: string[]; limit?: number } = {}
  try {
    body = await request.json()
  } catch {
    // ignore - allow empty body
  }

  const feeIds = Array.isArray(body.feeIds) ? body.feeIds.filter((id) => typeof id === "string") : null
  const limit = typeof body.limit === "number" ? Math.max(1, Math.min(200, body.limit)) : 50

  // Fetch refund_failed fee rows (optionally scoped to provided ids)
  let q = admin.from("audit_fees").select("id, user_id, amount, net_amount, status, source_address")
    .eq("status", "refund_failed")

  if (feeIds && feeIds.length > 0) q = q.in("id", feeIds)
  else q = q.limit(limit)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ processed: 0 })

  let processed = 0
  let succeeded = 0
  let failed = 0
  const details: Array<{ id: string; status: string; reason?: string }> = []

  for (const r of rows) {
    processed++
    const refundAmount = Number((r as any).net_amount ?? r.amount ?? 0)

    // Resolve destination address: first check source_address from original fee payment,
    // then fall back to saved user_wallets, otherwise try Circle user session
    let destination: string | null = null
    const row = r as any
    
    if (row.source_address) {
      destination = row.source_address
      console.log("Using stored source_address for refund retry", { feeId: r.id, destination })
    } else {
      try {
        const { data: walletRow } = await admin.from("user_wallets").select("address").eq("user_id", r.user_id).maybeSingle()
        if (walletRow?.address) {
          destination = walletRow.address
        } else {
          try {
            await createCircleUser(r.user_id)
            const session = await createUserSession(r.user_id)
            const wallet = await getUserWallet(session.userToken)
            if (wallet?.address) {
              destination = wallet.address
              await admin.from("user_wallets").upsert({ user_id: r.user_id, address: wallet.address })
            }
          } catch (walletErr) {
            console.warn("Unable to resolve wallet for refund retry", { feeId: r.id, userId: r.user_id, err: walletErr instanceof Error ? walletErr.message : walletErr })
          }
        }
      } catch (dbErr) {
        console.error("Error querying user_wallets", { feeId: r.id, err: dbErr })
        details.push({ id: r.id, status: "failed", reason: "db_error" })
        failed++
        continue
      }
    }

    if (!destination) {
      details.push({ id: r.id, status: "failed", reason: "no_wallet" })
      failed++
      continue
    }

    try {
      const result = await refundFee({ destinationAddress: destination, amount: refundAmount, idempotencyKey: r.id })
      const nextStatus = result.status === "settled" || result.status === "settling" ? "refunded" : "refund_failed"

      const updatePayload: any = { status: nextStatus }
      if (result?.externalId) {
        updatePayload.refund_external_id = result.externalId
        updatePayload.refunded_at = new Date().toISOString()
      }

      await admin.from("audit_fees").update(updatePayload).eq("id", r.id)

      details.push({ id: r.id, status: nextStatus })
      if (nextStatus === "refunded") succeeded++
      else failed++
    } catch (err) {
      console.error("Refund retry failed", { feeId: r.id, err })
      await admin.from("audit_fees").update({ status: "refund_failed" }).eq("id", r.id)
      details.push({ id: r.id, status: "failed", reason: "exception" })
      failed++
    }
  }

  return NextResponse.json({ processed, succeeded, failed, details })
}
