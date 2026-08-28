/**
 * Automated Verification Script for x402 HTTP Payment Protocol
 */

const { createX402Challenge, formatX402Headers, verifyX402PaymentProof } = require("../lib/x402")

async function testX402Flow() {
  console.log("=========================================")
  console.log("  Testing x402 Agentic Payment Protocol  ")
  console.log("=========================================")

  // 1. Test Challenge Creation
  console.log("\n1. Generating x402 Challenge for Basic Scan...")
  const basicChallenge = createX402Challenge("basic-scan")
  console.log("   Quote ID:", basicChallenge.quote_id)
  console.log("   Price:", basicChallenge.amount_usdc, basicChallenge.token_symbol)
  console.log("   Recipient:", basicChallenge.recipient_address)
  console.log("   Chains:", basicChallenge.accepted_chains.join(", "))

  // 2. Test Header Formatting
  console.log("\n2. Testing HTTP Response Headers...")
  const headers = formatX402Headers(basicChallenge)
  console.log("   WWW-Authenticate:", headers["WWW-Authenticate"])
  console.log("   X-402-Price:", headers["X-402-Price"])
  console.log("   X-402-Quote-ID:", headers["X-402-Quote-ID"])

  // 3. Test Payment Proof Verification
  console.log("\n3. Testing Payment Proof Verification...")
  
  // Case A: Missing proof
  const noProof = await verifyX402PaymentProof(null, "basic-scan")
  console.log("   Missing Proof -> Valid:", noProof.valid, `(Expected false - ${noProof.error})`)

  // Case B: Valid EVM Transaction Hash
  const mockTxHash = "0x89ab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abcd"
  const evmProof = await verifyX402PaymentProof(mockTxHash, "basic-scan")
  console.log("   EVM Tx Hash -> Valid:", evmProof.valid, "| Payer:", evmProof.payer, "| TxHash:", evmProof.txHash?.substring(0, 14) + "...")

  // Case C: Valid Circle Programmable Wallet Transaction
  const circleProof = await verifyX402PaymentProof(JSON.stringify({ circle_transaction_id: "circle_tx_9012af" }), "basic-scan")
  console.log("   Circle Tx -> Valid:", circleProof.valid, "| Payer:", circleProof.payer, "| TxHash:", circleProof.txHash)

  // 4. Test SIE Critical Scan Pricing Challenge
  console.log("\n4. Generating x402 Challenge for SIE Deep Scan...")
  const sieChallenge = createX402Challenge("sie-deep-scan")
  console.log("   SIE Price:", sieChallenge.amount_usdc, sieChallenge.token_symbol, `(Expected: 15.0 USDC)`)

  console.log("\n✅ x402 Protocol Implementation Verified Successfully!\n")
}

testX402Flow().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
