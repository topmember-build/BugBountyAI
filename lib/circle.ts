import "server-only"

/**
 * Circle / Arc settlement integration.
 *
 * Rewards are settled in USDC through Circle's API. When CIRCLE_API_KEY is
 * configured we make a real transfer request; otherwise we fall back to a
 * deterministic local settlement so the product remains fully functional in
 * preview/development without leaking credentials.
 */

const CIRCLE_API_BASE = process.env.CIRCLE_API_BASE ?? "https://api.circle.com"
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const CIRCLE_WALLET_ID = process.env.CIRCLE_WALLET_ID

export interface SettlementRequest {
  amount: number
  destinationAddress: string
  /** Idempotency key so retries don't double-pay. */
  idempotencyKey: string
  chain?: string
}

export interface SettlementResult {
  status: "settled" | "settling" | "failed"
  txHash: string | null
  externalId: string | null
  provider: string
  simulated: boolean
  error?: string
}

export function isCircleConfigured(): boolean {
  return Boolean(CIRCLE_API_KEY && CIRCLE_WALLET_ID)
}

/**
 * Settle a USDC reward to the agent's wallet via Circle.
 * Uses the Circle transfers API (developer-controlled wallets).
 */
export async function settleReward(req: SettlementRequest): Promise<SettlementResult> {
  // No credentials configured -> simulate a successful on-chain settlement.
  if (!isCircleConfigured()) {
    return simulateSettlement(req)
  }

  try {
    const res = await fetch(`${CIRCLE_API_BASE}/v1/w3s/developer/transactions/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        idempotencyKey: req.idempotencyKey,
        walletId: CIRCLE_WALLET_ID,
        destinationAddress: req.destinationAddress,
        tokenId: process.env.CIRCLE_USDC_TOKEN_ID,
        amounts: [req.amount.toString()],
        blockchain: req.chain ?? process.env.CIRCLE_CHAIN ?? "ARB",
        feeLevel: "MEDIUM",
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        status: "failed",
        txHash: null,
        externalId: null,
        provider: "circle_arc",
        simulated: false,
        error: `Circle API ${res.status}: ${text.slice(0, 200)}`,
      }
    }

    const data = (await res.json()) as {
      data?: { id?: string; txHash?: string; state?: string }
    }
    const state = data.data?.state
    return {
      status: state === "COMPLETE" ? "settled" : "settling",
      txHash: data.data?.txHash ?? null,
      externalId: data.data?.id ?? null,
      provider: "circle_arc",
      simulated: false,
    }
  } catch (err) {
    return {
      status: "failed",
      txHash: null,
      externalId: null,
      provider: "circle_arc",
      simulated: false,
      error: err instanceof Error ? err.message : "Unknown Circle error",
    }
  }
}

/**
 * Deterministic local settlement used when Circle is not configured.
 * Produces a pseudo tx hash so the UI can show a settled reward.
 */
function simulateSettlement(req: SettlementRequest): SettlementResult {
  const seed = `${req.idempotencyKey}:${req.destinationAddress}:${req.amount}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0")
  const txHash = `0x${(hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64)}`
  return {
    status: "settled",
    txHash,
    externalId: `sim_${Math.abs(hash).toString(36)}`,
    provider: "circle_arc_sim",
    simulated: true,
  }
}
