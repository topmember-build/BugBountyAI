import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { admin_code } = body

    const expectedAdminCode = process.env.PLAYGROUND_ADMIN_CODE || "ADMIN-BUG-BOUNTY-2026"

    if (admin_code && admin_code.trim() === expectedAdminCode.trim()) {
      return NextResponse.json({ success: true, verified: true, message: "Admin Access Code verified" })
    }

    return NextResponse.json(
      { success: false, verified: false, error: "Invalid Admin Access Code" },
      { status: 401 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify admin code" },
      { status: 500 }
    )
  }
}
