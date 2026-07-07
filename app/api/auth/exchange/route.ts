import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCircleUser } from "@/lib/circle-user"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = body?.code
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.json({ error: error.message ?? "Exchange failed" }, { status: 400 })
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await createCircleUser(user.id)
      }
    } catch (circleError) {
      console.error("Failed to provision Circle user after auth callback:", circleError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
