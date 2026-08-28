import { NextResponse, type NextRequest } from "next/server"
import { createX402Challenge, formatX402Headers, verifyX402PaymentProof } from "@/lib/x402"
import { analyzeRepository } from "@/lib/analyzer"
import type { AgentType } from "@/lib/types"

/**
 * GET /api/v1/audits
 * Discovery endpoint for autonomous agents detailing x402 payment requirements.
 */
export async function GET() {
  const challenge = createX402Challenge("basic-scan")
  const headers = formatX402Headers(challenge)

  return NextResponse.json(
    {
      protocol: "x402",
      name: "BugBountyAI Agentic Swarm API",
      version: "1.0.0",
      description: "Permissionless, HTTP 402 pay-per-scan vulnerability detection endpoint for autonomous AI agents.",
      supported_engines: ["basic-scan", "sie-deep-scan"],
      pricing: {
        "basic-scan": "5.00 USDC",
        "sie-deep-scan": "15.00 USDC",
      },
      sample_challenge: challenge,
    },
    { status: 200, headers }
  )
}

/**
 * POST /api/v1/audits
 * Autonomous Agent Scan Initiation via HTTP 402 micropayments.
 */
export async function POST(request: NextRequest) {
  const paymentProofHeader = request.headers.get("x-402-payment-proof") || request.headers.get("authorization")

  let body: {
    repo_url?: string
    branch?: string
    contract_code?: string
    contract_filename?: string
    engine?: "basic-scan" | "sie-deep-scan"
    agents?: AgentType[]
  }

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const requestedEngine = body.engine || "basic-scan"

  // 1. Check for valid x402 payment proof
  if (!paymentProofHeader) {
    const challenge = createX402Challenge(requestedEngine)
    const headers = formatX402Headers(challenge)

    return NextResponse.json(
      {
        error: "Payment Required",
        message: "This endpoint requires an x402 micropayment. Please settle the challenge and include the proof header.",
        x402_quote: challenge,
        instructions: {
          step_1: `Send ${challenge.amount_usdc} USDC to ${challenge.recipient_address} on any accepted chain.`,
          step_2: "Retry this POST request with header 'X-402-Payment-Proof: <tx_hash>'.",
        },
      },
      { status: 402, headers }
    )
  }

  // 2. Validate Payment Proof
  const verification = await verifyX402PaymentProof(paymentProofHeader, requestedEngine)
  if (!verification.valid) {
    const challenge = createX402Challenge(requestedEngine)
    return NextResponse.json(
      {
        error: "Invalid Payment Proof",
        details: verification.error,
        x402_quote: challenge,
      },
      { status: 402, headers: formatX402Headers(challenge) }
    )
  }

  // 3. Ensure target code or repo is provided
  if (!body.repo_url && !body.contract_code) {
    return NextResponse.json(
      { error: "Must provide either 'repo_url' or 'contract_code' in request body." },
      { status: 400 }
    )
  }

  try {
    // 4. Run the Security Intelligence Engine (SIE) analysis
    const analysis = await analyzeRepository({
      repoUrl: body.repo_url,
      branch: body.branch || "main",
      contractCode: body.contract_code,
      contractFilename: body.contract_filename || "contract.sol",
      selectedAgents: body.agents || ["security", "logic", "smart_contract", "dependency"],
    })

    return NextResponse.json({
      success: true,
      protocol: "x402",
      settlement: {
        paid_by: verification.payer,
        tx_hash: verification.txHash,
        engine: requestedEngine,
        timestamp: new Date().toISOString(),
      },
      analysis,
    })
  } catch (err: any) {
    console.error("[x402 API] Scan execution error:", err)
    return NextResponse.json(
      { error: "Audit analysis failed", details: err?.message },
      { status: 500 }
    )
  }
}
