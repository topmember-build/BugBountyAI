import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { processAuditInline } from "@/lib/audit-processor"

// POST /api/audits/process-pending — process any audits stuck in queued status
export async function POST() {
  const admin = createAdminClient()

  const { data: pendingAudits, error } = await admin
    .from("audits")
    .select("id, status, created_at")
    .in("status", ["queued", "scanning"])
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pendingAudits || pendingAudits.length === 0) {
    return NextResponse.json({ message: "No pending audits to process." }, { status: 200 })
  }

  const results = []
  for (const audit of pendingAudits) {
    console.log("[process-pending] Processing pending audit", audit.id)
    const result = await processAuditInline(audit.id)
    results.push({ auditId: audit.id, ...result })
  }

  return NextResponse.json({ processed: results.length, results }, { status: 200 })
}

export async function GET() {
  return POST()
}
