import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyContractDeposit } from "@/lib/escrow-contract"

// POST /api/circle/notify-retries — process pending notify retries
export async function POST() {
  const admin = createAdminClient()

  try {
    const now = new Date().toISOString()
    const { data: rows, error } = await admin
      .from("audit_fees")
      .select("id, amount, source_address, audit_fee_id, notify_attempts")
      .eq("notify_status", "retry_scheduled")
      .lte("notify_retry_at", now)
      .order("notify_retry_at", { ascending: true })
      .limit(20)

    if (error) throw error

    const results: any[] = []

    for (const r of rows ?? []) {
      const feeId = r.id
      try {
        const { data: audit } = await admin.from("audits").select("id").eq("audit_fee_id", feeId).maybeSingle()
        if (!audit) {
          await admin.from("audit_fees").update({ notify_status: "no_audit" }).eq("id", feeId)
          results.push({ feeId, status: "no_audit" })
          continue
        }

        const res = await notifyContractDeposit({ auditUuid: audit.id, depositor: r.source_address ?? "", amount: Number(r.amount ?? 0) })
        const txHash = res && (res as any).txHash ? (res as any).txHash : (res && (res as any).transactionHash ? (res as any).transactionHash : null)

        if (txHash) {
          await admin.from("audit_fees").update({ notify_tx_hash: txHash, notify_status: "notified", notify_attempts: 0, last_notify_error: null, notify_retry_at: null }).eq("id", feeId)
          results.push({ feeId, status: "notified", txHash })
        } else {
          await admin.from("audit_fees").update({ notify_status: "attempted", notify_attempts: 0, last_notify_error: null }).eq("id", feeId)
          results.push({ feeId, status: "attempted" })
        }
      } catch (err) {
        // schedule next retry
        const attempts = (r.notify_attempts ?? 0) + 1
        const maxAttempts = 5
        const backoffMs = Math.min(60 * 60 * 1000, 1000 * Math.pow(2, attempts))
        const retryAt = new Date(Date.now() + backoffMs).toISOString()
        const errMsg = err instanceof Error ? err.message : String(err)
        const update = {
          notify_status: attempts >= maxAttempts ? "failed" : "retry_scheduled",
          notify_attempts: attempts,
          last_notify_error: errMsg?.slice(0, 1000) ?? null,
          notify_retry_at: retryAt,
        }
        try {
          await admin.from("audit_fees").update(update).eq("id", feeId)
        } catch (dbErr) {
          console.error("failed to update retry metadata", dbErr)
        }
        results.push({ feeId, status: update.notify_status })
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results })
  } catch (err) {
    console.error("notify-retries error", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
