import "server-only"

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets"

/**
 * Circle / Arc settlement integration.
 *
 * Rewards are settled in USDC through Circle's developer-controlled wallets.
 * The official SDK handles entity secret ciphertext encryption per request.
 * When credentials are missing we fall back to a deterministic local
 * settlement so the product remains fully functional in preview/development.
 */

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const CIRCLE_WALLET_ID = process.env.CIRCLE_WALLET_ID
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

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
  return Boolean(CIRCLE_API_KEY && CIRCLE_WALLET_ID && CIRCLE_ENTITY_SECRET)
}

let circleClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null

function getCircleClient() {
  if (!circleClient) {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY!,
      entitySecret: CIRCLE_ENTITY_SECRET!,
    })
  }
  return circleClient
}

/** Cached USDC token id resolved from the wallet's balances. */
let cachedUsdcTokenId: string | null = process.env.CIRCLE_USDC_TOKEN_ID ?? null

async function resolveUsdcTokenId(): Promise<string | null> {
  if (cachedUsdcTokenId) return cachedUsdcTokenId

  const client = getCircleClient()
  const res = await client.getWalletTokenBalance({ id: CIRCLE_WALLET_ID! })
  const balances = res.data?.tokenBalances ?? []
  const usdc = balances.find((b) => b.token?.symbol?.toUpperCase().includes("USDC"))
  if (usdc?.token?.id) {
    cachedUsdcTokenId = usdc.token.id
    return cachedUsdcTokenId
  }
  return null
}

/**
 * Settle a USDC reward to the agent's wallet via Circle.
 * Uses the Circle SDK (developer-controlled wallets), which generates the
 * required entity secret ciphertext for each transaction.
 */
export async function settleReward(req: SettlementRequest): Promise<SettlementResult> {
  // No credentials configured -> simulate a successful on-chain settlement.
  if (!isCircleConfigured()) {
    return simulateSettlement(req)
  }

  try {
    const client = getCircleClient()
    const tokenId = await resolveUsdcTokenId()

    if (!tokenId) {
      return {
        status: "failed",
        txHash: null,
        externalId: null,
        provider: "circle_arc",
        simulated: false,
        error: "No USDC token found in the Circle wallet. Fund the wallet with USDC first.",
      }
    }

    const res = await client.createTransaction({
      walletId: CIRCLE_WALLET_ID!,
      tokenId,
      destinationAddress: req.destinationAddress,
      amount: [req.amount.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: req.idempotencyKey,
    })

    const tx = res.data
    const state = tx?.state
    return {
      status: state === "COMPLETE" ? "settled" : "settling",
      txHash: null,
      externalId: tx?.id ?? null,
      provider: "circle_arc",
      simulated: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Circle error"
    return {
      status: "failed",
      txHash: null,
      externalId: null,
      provider: "circle_arc",
      simulated: false,
      error: message.slice(0, 300),
    }
  }
}

/** The treasury wallet's on-chain address (fee destination + payout source). */
let cachedTreasuryAddress: string | null = null

export async function getTreasuryAddress(): Promise<string | null> {
  if (cachedTreasuryAddress) return cachedTreasuryAddress
  if (!isCircleConfigured()) return null
  try {
    const client = getCircleClient()
    const res = await client.getWallet({ id: CIRCLE_WALLET_ID! })
    const address = res.data?.wallet?.address ?? null
    if (address) cachedTreasuryAddress = address
    return address
  } catch {
    return null
  }
}

export interface FundingResult {
  status: "settling" | "settled" | "failed"
  externalId: string | null
  simulated: boolean
  error?: string
}

/**
 * Seed a freshly created user wallet with a small amount of test USDC from the
 * treasury so they can immediately pay for an audit on Arc testnet.
 */
export async function fundUserWallet(params: {
  destinationAddress: string
  amount: number
  idempotencyKey: string
}): Promise<FundingResult> {
  if (!isCircleConfigured()) {
    return { status: "settled", externalId: `sim_fund_${params.idempotencyKey}`, simulated: true }
  }
  try {
    const client = getCircleClient()
    const tokenId = await resolveUsdcTokenId()
    if (!tokenId) {
      return { status: "failed", externalId: null, simulated: false, error: "No USDC in treasury wallet to fund users." }
    }
    const res = await client.createTransaction({
      walletId: CIRCLE_WALLET_ID!,
      tokenId,
      destinationAddress: params.destinationAddress,
      amount: [params.amount.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: params.idempotencyKey,
    })
    return {
      status: res.data?.state === "COMPLETE" ? "settled" : "settling",
      externalId: res.data?.id ?? null,
      simulated: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Circle error"
    return { status: "failed", externalId: null, simulated: false, error: message.slice(0, 300) }
  }
}

/**
 * Refund a user's audit fee from the treasury back to their wallet, used when
 * an audit fails after the fee was collected.
 */
export async function refundFee(params: {
  destinationAddress: string
  amount: number
  idempotencyKey: string
}): Promise<FundingResult> {
  // Refund mechanics are identical to funding: treasury -> user wallet.
  return fundUserWallet(params)
}

export interface TransactionStatus {
  status: "settled" | "settling" | "failed"
  txHash: string | null
}

/**
 * Look up the current on-chain state of a Circle transaction.
 * Used to reconcile rewards stuck in "settling" after confirmation.
 */
export async function getTransactionStatus(externalId: string): Promise<TransactionStatus | null> {
  if (!isCircleConfigured()) return null

  try {
    const client = getCircleClient()
    const res = await client.getTransaction({ id: externalId })
    const tx = res.data?.transaction
    if (!tx) return null

    const state = tx.state
    let status: TransactionStatus["status"] = "settling"
    if (state === "COMPLETE" || state === "CONFIRMED") status = "settled"
    else if (state === "FAILED" || state === "CANCELLED" || state === "DENIED") status = "failed"

    return { status, txHash: tx.txHash ?? null }
  } catch {
    return null
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
