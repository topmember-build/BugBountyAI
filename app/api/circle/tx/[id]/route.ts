import { NextResponse, type NextRequest } from "next/server"
import { getTransactionStatus } from "@/lib/circle"

export async function GET(request: NextRequest, context: any) {
  const id = context?.params?.id ?? request.nextUrl.pathname.split("/").pop()
  if (!id) return NextResponse.json({ error: "Missing transaction id" }, { status: 400 })

  try {
    const status = await getTransactionStatus(id)
    return NextResponse.json({ id, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
