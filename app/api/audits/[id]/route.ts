import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/audits/[id] — fetch one audit plus its findings (RLS scopes to owner)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 })
  }
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 })
  }

  const { data: findings, error: findingsError } = await supabase
    .from("findings")
    .select("*, agents(name, slug, agent_type)")
    .eq("audit_id", id)
    .order("reward_amount", { ascending: false })

  if (findingsError) {
    return NextResponse.json({ error: findingsError.message }, { status: 500 })
  }

  const { data: feeRow } = await supabase
    .from("audit_fees")
    .select("status")
    .eq("user_id", audit.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    audit,
    findings: findings ?? [],
    feeStatus: feeRow?.status ?? null,
  })
}
