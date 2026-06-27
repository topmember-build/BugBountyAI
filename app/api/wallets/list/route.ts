import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ wallets: [] }, { status: 401 })

  const { data, error } = await supabase.from("user_wallets").select("address, created_at").eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ wallets: data ?? [] })
}
