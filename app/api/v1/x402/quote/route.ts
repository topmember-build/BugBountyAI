import { NextResponse, type NextRequest } from "next/server"
import { createX402Challenge, formatX402Headers } from "@/lib/x402"

/**
 * GET/POST /api/v1/x402/quote
 * Quick quote generation endpoint for autonomous agents
 */
export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get("service") || "basic-scan"
  const challenge = createX402Challenge(service)
  return NextResponse.json({ quote: challenge }, { headers: formatX402Headers(challenge) })
}

export async function POST(request: NextRequest) {
  let body: { service?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const challenge = createX402Challenge(body.service || "basic-scan")
  return NextResponse.json({ quote: challenge }, { headers: formatX402Headers(challenge) })
}
