import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCircleUser, createUserSession, createWalletSetupChallenge } from "@/lib/circle-user"

const APP_ID = process.env.CIRCLE_APP_ID ?? null

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!APP_ID) {
    return NextResponse.json({ error: "Circle wallet is not configured." }, { status: 500 })
  }

  try {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)
    const challengeId = await createWalletSetupChallenge(session.userToken)

    return NextResponse.json({
      appId: APP_ID,
      userToken: session.userToken,
      encryptionKey: session.encryptionKey,
      challengeId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to create wallet setup challenge" },
      { status: 500 },
    )
  }
}
