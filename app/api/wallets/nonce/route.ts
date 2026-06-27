import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const address = body?.address
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })

  const supabase = await createClient()
  const message = `BugBountyAI verification ${Date.now()} ${Math.random().toString(36).slice(2, 10)}`
  const nonce = Math.random().toString(36).slice(2, 12)

  const { error } = await supabase.from("wallet_nonces").insert({ address, message, nonce })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ address, message, nonce })
}
