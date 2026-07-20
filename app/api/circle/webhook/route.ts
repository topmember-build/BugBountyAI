import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyContractDeposit } from "@/lib/escrow-contract"
import crypto from "crypto"

// Circle webhook receiver — verifies signature when `CIRCLE_WEBHOOK_SECRET` is set.
export async function POST(request: NextRequest) {
  const admin = createAdminClient()

  // Read raw body so we can verify signature if configured
  let raw: string
  try {
    raw = await request.text()
  } catch (err) {
    return NextResponse.json({ error: "Unable to read body" }, { status: 400 })
  }

  // Verify signature if secret exists
  try {
    const secret = process.env.CIRCLE_WEBHOOK_SECRET
    const header = request.headers.get("x-circle-signature") || request.headers.get("circle-signature") || request.headers.get("x-signature")
    if (secret && header) {
      const hmac = crypto.createHmac("sha256", secret).update(raw).digest("hex")
      if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(header))) {
        console.warn("[circle:webhook] signature mismatch")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }
  } catch (err) {
    console.warn("[circle:webhook] signature verification failed", err)
  }

  let body: any
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const eventType = body?.type || body?.event || null
    const data = body?.data || body?.payload || null
    const txId = data?.id ?? data?.transaction?.id ?? null
    const state = data?.status ?? data?.transaction?.state ?? null

    console.log("[circle:webhook] Received event", { eventType, txId, state })

    if (!txId) return NextResponse.json({ ok: true })

    const settledStates = new Set(["settled", "SETTLED", "COMPLETE", "COMPLETE_CONFIRMED"])
    if (state && settledStates.has(String(state))) {
      const { data: feeRow } = await admin
        .from("audit_fees")
        .select("id, amount, source_address")
        .eq("refund_external_id", txId)
        .maybeSingle()

      if (feeRow) {
        await admin.from("audit_fees").update({ status: "settled", refund_tx_hash: txId }).eq("id", feeRow.id)

        // Try to find an audit linked to this fee and register the on-chain deposit
        const { data: audit } = await admin
          .from("audits")
          .select("id, status")
          .eq("audit_fee_id", feeRow.id)
          .maybeSingle()

        if (audit) {
          try {
            const res = await notifyContractDeposit({ auditUuid: audit.id, depositor: feeRow.source_address ?? "", amount: Number(feeRow.amount ?? 0) })
            // If notifyContractDeposit returns txHash, persist it for reconciliation
            const txHash = (res && (res as any).txHash) || (res && (res as any).transactionHash) || null
            if (txHash) {
              await admin.from("audit_fees").update({ notify_tx_hash: txHash, notify_status: "notified", notify_attempts: 0, last_notify_error: null }).eq("id", feeRow.id)
            } else {
              await admin.from("audit_fees").update({ notify_status: "attempted", notify_attempts: 0, last_notify_error: null }).eq("id", feeRow.id)
            }

            console.log("[circle:webhook] notifyContractDeposit called for audit", { auditId: audit.id, txHash })
          } catch (err) {
            console.error("[circle:webhook] notifyContractDeposit error", err)
            // Read current attempts (if any) and schedule retry with exponential backoff
            try {
              const { data: current } = await admin.from("audit_fees").select("notify_attempts").eq("id", feeRow.id).maybeSingle()
              const attempts = (current?.notify_attempts ?? 0) + 1
              const maxAttempts = 5
              const backoffMs = Math.min(60 * 60 * 1000, 1000 * Math.pow(2, attempts)) // cap 1 hour
              const retryAt = new Date(Date.now() + backoffMs).toISOString()
              const errMsg = err instanceof Error ? err.message : String(err)

              const update: Record<string, any> = {
                notify_status: attempts >= maxAttempts ? "failed" : "retry_scheduled",
                notify_attempts: attempts,
                last_notify_error: errMsg?.slice(0, 1000) ?? null,
                notify_retry_at: retryAt,
              }

              await admin.from("audit_fees").update(update).eq("id", feeRow.id)
            } catch (dbErr) {
              console.error("[circle:webhook] failed to record notify retry metadata", dbErr)
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[circle:webhook] processing error", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
