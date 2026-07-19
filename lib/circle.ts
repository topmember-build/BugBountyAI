import "server-only"

import { randomUUID } from "node:crypto"
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets"
import {
  isEscrowConfigured,
  getContractAddress,
  releaseContractReward,
  refundContractFee,
  type EscrowSettlementResult,
  type EscrowFundingResult,
} from "@/lib/escrow-contract"

/**
 * Circle / Arc settlement integration.
 *
 * Outgoing payments (rewards + refunds) are now routed through the
 * BugBountyEscrow smart contract instead of the Circle dev wallet.
 * The Circle SDK is retained for:
 *   - Faucet / user onboarding (fundUserWallet)
 *   - Dev/preview simulation fallback when escrow is not configured
 *
 * TREASURY_ADDRESS now resolves to the escrow contract address.
 */

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const CIRCLE_WALLET_ID = process.env.CIRCLE_WALLET_ID
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

export interface SettlementRequest {
  amount: number
  destinationAddress: string
  /** Idempotency key so retries don't double-pay. */
  idempotencyKey: string
  /** Audit UUID used to derive the on-chain escrow auditId. */
  auditUuid?: string
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
  try {
    const res = await client.getWalletTokenBalance({ id: CIRCLE_WALLET_ID! })
    const balances = res.data?.tokenBalances ?? []
    console.log("[circle] Available token balances:", JSON.stringify(balances.map(b => ({ symbol: b.token?.symbol, id: b.token?.id, amount: b.amount })), null, 2))
    const usdc = balances.find((b) => b.token?.symbol?.toUpperCase().includes("USDC") && b.token?.isNative === false)
    if (usdc?.token?.id) {
      cachedUsdcTokenId = usdc.token.id
      console.log("[circle] Resolved USDC token ID:", cachedUsdcTokenId)
      return cachedUsdcTokenId
    }
    console.error("[circle] No USDC token found in wallet balances")
    return null
  } catch (err) {
    console.error("[circle] Error resolving USDC token ID:", err instanceof Error ? err.message : err)
    return null
  }
}

function normalizeIdempotencyKey(value: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : randomUUID()
}

async function buildTransferPayload(params: {
  destinationAddress: string
  amount: number
  idempotencyKey: string
  tokenId: string
}) {
  const payload: Record<string, unknown> = {
    tokenId: params.tokenId,
    walletId: CIRCLE_WALLET_ID!,
    destinationAddress: params.destinationAddress,
    amount: [params.amount.toFixed(6)],
    fee: {
      type: "level" as const,
      config: {
        feeLevel: "MEDIUM" as const,
      },
    },
    idempotencyKey: normalizeIdempotencyKey(params.idempotencyKey),
  }

  return payload
}

/**
 * Settle a USDC reward to an agent wallet.
 *
 * Routes through the BugBountyEscrow contract when configured.
 * Falls back to Circle dev-wallet when escrow is not configured (dev/sim mode).
 *
 * NOTE: `req.idempotencyKey` is expected to be the audit DB UUID when coming
 * from the audits route so the contract can derive the correct auditId.
 */
export async function settleReward(req: SettlementRequest): Promise<SettlementResult> {
  // Smart contract path (production)
  if (isEscrowConfigured()) {
    const result: EscrowSettlementResult = await releaseContractReward({
      auditUuid: req.auditUuid ?? req.idempotencyKey,
      destinationAddress: req.destinationAddress,
      amount: req.amount,
      idempotencyKey: req.idempotencyKey,
    })
    return result
  }

  // Circle dev-wallet fallback (development / simulation)
  if (!isCircleConfigured()) {
    return simulateSettlement(req)
  }

  try {
    const client = getCircleClient()
    const tokenId = await resolveUsdcTokenId()

    if (!tokenId) {
      console.error("[circle] settleReward failed because USDC token could not be resolved")
      return {
        status: "failed",
        txHash: null,
        externalId: null,
        provider: "circle_arc",
        simulated: false,
        error: "No USDC token found in the Circle wallet. Fund the wallet with USDC first.",
      }
    }

    const payload = await buildTransferPayload({
      destinationAddress: req.destinationAddress,
      amount: req.amount,
      idempotencyKey: req.idempotencyKey,
      tokenId,
    })
    console.log("[circle] settleReward calling createTransaction with payload:", JSON.stringify(payload, null, 2))

    const res = await client.createTransaction(payload)
    console.log("[circle] settleReward response", JSON.stringify(res?.data ?? res, null, 2))

    const tx = res.data
    const state = tx?.state
    return {
      status: state === "COMPLETE" ? "settled" : "settling",
      txHash: tx?.txHash ?? null,
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

/** The treasury/escrow address — the smart contract when configured, else the Circle dev wallet. */
let cachedTreasuryAddress: string | null = null

export async function getTreasuryAddress(): Promise<string | null> {
  // 1. Smart contract escrow (production path)
  const contractAddr = getContractAddress()
  if (contractAddr) return contractAddr

  // 2. Circle dev wallet (fallback for dev/sim)
  if (cachedTreasuryAddress) return cachedTreasuryAddress
  if (!isCircleConfigured()) return null
  try {
    const client = getCircleClient()
    const res = await client.getWallet({ id: CIRCLE_WALLET_ID! })
    const address = res.data?.wallet?.address ?? null
    if (address) cachedTreasuryAddress = address
    return address
  } catch (error) {
    console.error("[circle] Error retrieving treasury address:", error)
    return null
  }
}

let cachedDeveloperWalletAddress: string | null = null

export async function getDeveloperWalletAddress(): Promise<string | null> {
  if (cachedDeveloperWalletAddress) return cachedDeveloperWalletAddress
  if (!isCircleConfigured()) return null
  try {
    const client = getCircleClient()
    const res = await client.getWallet({ id: CIRCLE_WALLET_ID! })
    const address = res.data?.wallet?.address ?? null
    if (address) cachedDeveloperWalletAddress = address
    return address
  } catch (error) {
    console.error("[circle] Error retrieving developer wallet address:", error)
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
    
    const payload = await buildTransferPayload({
      destinationAddress: params.destinationAddress,
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
      tokenId,
    })
    console.log("[circle] fundUserWallet calling createTransaction with payload:", JSON.stringify(payload, null, 2))

    const res = await client.createTransaction(payload)
    console.log("[circle] fundUserWallet createTransaction response", {
      txId: res.data?.id,
      txState: res.data?.state,
    })
    return {
      status: res.data?.state === "COMPLETE" ? "settled" : "settling",
      externalId: res.data?.id ?? null,
      simulated: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Circle error"
    console.error("[circle] fundUserWallet caught exception", {
      error: message,
      errorType: err instanceof Error ? err.constructor.name : typeof err,
      fullError: JSON.stringify(err, null, 2),
    })
    return { status: "failed", externalId: null, simulated: false, error: message.slice(0, 300) }
  }
}

/**
 * Refund a user's audit fee back to their wallet.
 *
 * Routes through the BugBountyEscrow contract when configured (the contract
 * resolves the depositor address automatically from on-chain state).
 * Falls back to Circle dev-wallet transfer in dev/sim mode.
 *
 * NOTE: `idempotencyKey` is expected to be the audit DB UUID so the contract
 * can derive the correct on-chain auditId.
 */
export async function refundFee(params: {
  destinationAddress: string
  amount: number
  idempotencyKey: string
}): Promise<FundingResult> {
  console.log("[circle] refundFee called", {
    amount: params.amount,
    destination: params.destinationAddress?.slice(0, 10),
    escrowConfigured: isEscrowConfigured(),
    circleConfigured: isCircleConfigured(),
  })

  // Smart contract path (production)
  if (isEscrowConfigured()) {
    const result: EscrowFundingResult = await refundContractFee({
      auditUuid: params.idempotencyKey,
    })
    console.log("[escrow] refundFee result", result)
    return result
  }

  // Circle dev-wallet fallback (development / simulation)
  const result = await fundUserWallet(params)
  console.log("[circle] refundFee result", {
    status: result.status,
    externalId: result.externalId,
    simulated: result.simulated,
    error: result.error,
  })
  return result
}

export async function transferFromDeveloperWallet(params: {
  destinationAddress: string
  amount: number
  idempotencyKey: string
}): Promise<{ transactionId: string | null; error?: string }> {
  if (!isCircleConfigured()) {
    return { transactionId: null, error: "Circle is not configured." }
  }

  try {
    const client = getCircleClient()
    const tokenId = await resolveUsdcTokenId()
    if (!tokenId) {
      return { transactionId: null, error: "No USDC token ID found in developer wallet balances." }
    }

    const payload = await buildTransferPayload({
      destinationAddress: params.destinationAddress,
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
      tokenId,
    })

    console.log("[circle] transferFromDeveloperWallet calling createTransaction:", JSON.stringify(payload, null, 2))
    const res = await client.createTransaction(payload)
    const tx = res.data?.transaction ?? res.data
    return { transactionId: tx?.id ?? null }
  } catch (err) {
    return { transactionId: null, error: err instanceof Error ? err.message : String(err) }
  }
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
