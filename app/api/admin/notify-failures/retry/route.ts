import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyContractDeposit } from "@/lib/escrow-contract"

export async function POST(request: Request) {
  const admin = createAdminClient()
  let body: any
  try {
    body = await request.json()
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const feeId = body?.feeId
  if (!feeId) return NextResponse.json({ error: "feeId is required" }, { status: 400 })

  try {
    const { data: feeRow } = await admin.from("audit_fees").select("id,amount,source_address").eq("id", feeId).maybeSingle()
    if (!feeRow) return NextResponse.json({ error: "fee not found" }, { status: 404 })

    const { data: audit } = await admin.from("audits").select("id").eq("audit_fee_id", feeId).maybeSingle()
    if (!audit) return NextResponse.json({ error: "linked audit not found" }, { status: 404 })

    try {
      const res = await notifyContractDeposit({ auditUuid: audit.id, depositor: feeRow.source_address ?? "", amount: Number(feeRow.amount ?? 0) })
      const txHash = (res && (res as any).txHash) || (res && (res as any).transactionHash) || null
      if (txHash) {
        await admin.from("audit_fees").update({ notify_tx_hash: txHash, notify_status: "notified", notify_attempts: 0, last_notify_error: null, notify_retry_at: null }).eq("id", feeId)
        return NextResponse.json({ ok: true, txHash })
      } else {
        await admin.from("audit_fees").update({ notify_status: "attempted" }).eq("id", feeId)
        return NextResponse.json({ ok: true, attempted: true })
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      const { data: current } = await admin.from("audit_fees").select("notify_attempts").eq("id", feeId).maybeSingle()
      const attempts = (current?.notify_attempts ?? 0) + 1
      const maxAttempts = 5
      const backoffMs = Math.min(60 * 60 * 1000, 1000 * Math.pow(2, attempts))
      const retryAt = new Date(Date.now() + backoffMs).toISOString()
      const update: Record<string, any> = {
        notify_status: attempts >= maxAttempts ? "failed" : "retry_scheduled",
        notify_attempts: attempts,
        last_notify_error: errMsg?.slice(0, 1000) ?? null,
        notify_retry_at: retryAt,
      }
      await admin.from("audit_fees").update(update).eq("id", feeId)
      return NextResponse.json({ ok: false, status: update.notify_status, error: errMsg })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
