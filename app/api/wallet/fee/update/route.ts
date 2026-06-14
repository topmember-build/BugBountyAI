import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { transactionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const transactionId = body.transactionId?.trim()
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("audit_fees")
    .update({ transaction_id: transactionId })
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not attach transaction to pending fee" },
      { status: 400 },
    )
  }

  return NextResponse.json({ ok: true, transactionId: data.transaction_id })
}
