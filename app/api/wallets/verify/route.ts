import { NextResponse } from "next/server"
// Use require with ts-ignore so local dev without installing deps doesn't fail typecheck immediately
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { verifyMessage } = require("ethers")
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function markNonceUsed(supabase: any, address: string, nonce: string) {
  await supabase.from("wallet_nonces").update({ used: true }).eq("address", address).eq("nonce", nonce)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const address = body?.address
  const signature = body?.signature

  if (!address || !signature) {
    return NextResponse.json({ error: "address and signature are required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    // Find nonce row
    const { data: rows } = await admin.from("wallet_nonces").select("nonce, message, used").eq("address", address).order("created_at", { ascending: false }).limit(1)
    const row = rows?.[0]
    if (!row) return NextResponse.json({ error: "nonce not found" }, { status: 400 })
    if (row.used) return NextResponse.json({ error: "nonce already used" }, { status: 400 })

    const recovered = verifyMessage(row.message, signature)
    if (String(recovered).toLowerCase() !== String(address).toLowerCase()) {
      return NextResponse.json({ error: "Signature does not match address" }, { status: 400 })
    }

    // mark used and persist user_wallets if authenticated
    await markNonceUsed(admin, address, row.nonce)

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes.user
    if (user) {
      await admin.from("user_wallets").upsert({ user_id: user.id, address })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 })
  }
}
