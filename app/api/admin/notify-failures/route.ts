import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/admin/notify-failures?status=failed|retry_scheduled&page=1&per=50
export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  const url = new URL(request.url)
  const status = url.searchParams.get("status") || null
  const page = Number(url.searchParams.get("page") || "1")
  const per = Math.min(200, Number(url.searchParams.get("per") || "50"))

  try {
    let q = admin.from("audit_fees").select("id,user_id,amount,source_address,refund_external_id,notify_status,notify_attempts,notify_retry_at,last_notify_error,notify_tx_hash,created_at")
    if (status) q = q.eq("notify_status", status)
    const offset = (Math.max(1, page) - 1) * per
    const { data, error } = await q.order("created_at", { ascending: false }).range(offset, offset + per - 1)
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
