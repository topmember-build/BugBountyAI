import { NextResponse, type NextRequest } from "next/server"
import { getTransactionStatus } from "@/lib/circle"
import { createClient } from "@/lib/supabase/server"
import { createUserSession, getUserWallet, getUserUsdcBalance } from "@/lib/circle-user"

export async function GET(request: NextRequest, context: any) {
  const id = context?.params?.id ?? request.nextUrl.pathname.split("/").slice(-2)[0]
  const userId = request.nextUrl.searchParams.get("userId")
  if (!id) return NextResponse.json({ error: "Missing transaction id" }, { status: 400 })
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  try {
    const txStatus = await getTransactionStatus(id)

    const result: any = { id, txStatus }

    if (txStatus?.status === "settled") {
      // fetch user's wallet balance
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      // Temporarily create session for the target user
      const session = await createUserSession(userId)
      const wallet = await getUserWallet(session.userToken)
      if (wallet) {
        const balance = await getUserUsdcBalance(session.userToken, wallet.walletId)
        result.userWallet = { wallet, balance }
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
