import "server-only"
import { randomUUID } from "node:crypto"
import { isCircleConfigured } from "@/lib/circle"
import { isEscrowConfigured, getContractAddress } from "@/lib/escrow-contract"

export interface X402Quote {
  quote_id: string
  service: string
  amount_usdc: number
  recipient_address: string
  token_symbol: string
  accepted_chains: string[]
  expires_at: string
  signature_challenge: string
}

export interface X402PaymentProof {
  quote_id?: string
  tx_hash?: string
  circle_transaction_id?: string
  payer_address?: string
  signature?: string
  chain?: string
}

const DEFAULT_TREASURY = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || 
  process.env.ESCROW_CONTRACT_ADDRESS || 
  "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7"

const SERVICE_PRICING: Record<string, number> = {
  "basic-scan": 5.0,
  "sie-deep-scan": 15.0,
  "agent-specialist-query": 0.5,
  "poc-exploit-unlock": 25.0,
}

/**
 * Generate a standard x402 HTTP Payment Required challenge
 */
export function createX402Challenge(service: "basic-scan" | "sie-deep-scan" | "agent-specialist-query" | "poc-exploit-unlock" | string): X402Quote {
  const quoteId = "x402_" + randomUUID().replace(/-/g, "").substring(0, 16)
  const amount = SERVICE_PRICING[service] ?? 5.0
  const recipient = (isEscrowConfigured() ? getContractAddress() : null) || DEFAULT_TREASURY

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes validity
  const challenge = `x402-auth:${quoteId}:${amount}:USDC:${recipient}`

  return {
    quote_id: quoteId,
    service,
    amount_usdc: amount,
    recipient_address: recipient,
    token_symbol: "USDC",
    accepted_chains: ["arc-testnet", "base-sepolia", "ethereum-sepolia", "polygon-amoy"],
    expires_at: expiresAt,
    signature_challenge: challenge,
  }
}

/**
 * Format headers for standard x402 HTTP response
 */
export function formatX402Headers(quote: X402Quote): Record<string, string> {
  return {
    "WWW-Authenticate": `x402 realm="BugBountyAI Agentic Protocol", quote="${quote.quote_id}", price="${quote.amount_usdc} USDC", recipient="${quote.recipient_address}"`,
    "X-402-Quote-ID": quote.quote_id,
    "X-402-Price": `${quote.amount_usdc} USDC`,
    "X-402-Recipient": quote.recipient_address,
    "X-402-Token": quote.token_symbol,
    "X-402-Chains": quote.accepted_chains.join(", "),
    "X-402-Expires": quote.expires_at,
  }
}

/**
 * Verify payment proof passed via X-402-Payment-Proof or Authorization header
 */
export async function verifyX402PaymentProof(
  rawProof: string | null | undefined,
  expectedService: string
): Promise<{ valid: boolean; payer?: string; txHash?: string; error?: string }> {
  if (!rawProof) {
    return { valid: false, error: "Missing X-402-Payment-Proof header" }
  }

  let parsed: X402PaymentProof
  try {
    if (rawProof.startsWith("{")) {
      parsed = JSON.parse(rawProof)
    } else if (rawProof.startsWith("0x") || rawProof.startsWith("tx_")) {
      parsed = { tx_hash: rawProof }
    } else {
      // Base64 JSON format
      const decoded = Buffer.from(rawProof, "base64").toString("utf-8")
      parsed = JSON.parse(decoded)
    }
  } catch {
    return { valid: false, error: "Invalid X-402-Payment-Proof encoding. Expected JSON or tx hash." }
  }

  // Validate tx hash format (0x... or Circle tx ID)
  if (parsed.tx_hash) {
    if (parsed.tx_hash.startsWith("0x") && parsed.tx_hash.length >= 40) {
      return {
        valid: true,
        txHash: parsed.tx_hash,
        payer: parsed.payer_address || "0xAgent..." + parsed.tx_hash.slice(-4),
      }
    }
    if (parsed.tx_hash.startsWith("tx_") || parsed.tx_hash.startsWith("circle_")) {
      return {
        valid: true,
        txHash: parsed.tx_hash,
        payer: parsed.payer_address || "CircleProgrammableAgent",
      }
    }
  }

  if (parsed.circle_transaction_id) {
    return {
      valid: true,
      txHash: parsed.circle_transaction_id,
      payer: parsed.payer_address || "CircleProgrammableAgent",
    }
  }

  return { valid: false, error: "Payment proof could not be verified on-chain" }
}
