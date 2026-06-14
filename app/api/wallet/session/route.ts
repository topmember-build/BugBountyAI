import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCircleUser, createUserSession } from "@/lib/circle-user"

// POST /api/wallet/session — Mint a short-lived Circle user session
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure the Circle user exists (idempotent)
  await createCircleUser(user.id)

  const session = await createUserSession(user.id)
  return NextResponse.json(session)
}
