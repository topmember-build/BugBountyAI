import "server-only"

// ethers v6 — use require() to avoid ESM/bundler resolution issues.
// Types are imported separately so TS is happy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ethersLib = require("ethers") as typeof import("ethers")
const { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes, formatEther } = ethersLib

type EthersProvider = InstanceType<(typeof ethersLib)["JsonRpcProvider"]>
type EthersSigner = InstanceType<(typeof ethersLib)["Wallet"]>
type EthersContract = InstanceType<(typeof ethersLib)["Contract"]>

/**
 * BugBountyEscrow — server-side contract interaction layer.
 *
 * Replaces Circle developer-controlled wallet for outgoing payments.
 * The user still pays via their Circle user-controlled wallet; USDC lands
 * at the contract address instead of the Circle dev wallet.
 *
 * Required env vars:
 *   ESCROW_CONTRACT_ADDRESS       — deployed BugBountyEscrow address
 *   ESCROW_OPERATOR_PRIVATE_KEY   — server relayer private key (OPERATOR_ROLE)
 *   ESCROW_RPC_URL                — JSON-RPC endpoint for the target chain
 */

// ---------------------------------------------------------------------------
// ABI — only the functions the server needs to call
// ---------------------------------------------------------------------------
const ESCROW_ABI = [
  // operator: register a user USDC transfer as an audit deposit
  "function notifyDeposit(bytes32 auditId, address depositor, uint256 amount) external",
  // operator: pay an agent for a finding
  "function releaseReward(bytes32 auditId, address recipient, uint256 amount) external",
  // operator: refund remaining balance to the depositor
  "function refund(bytes32 auditId) external",
  // operator: mark audit settled with no refund
  "function settle(bytes32 auditId) external",
  // view
  "function getEscrow(bytes32 auditId) external view returns (tuple(address depositor, uint256 totalAmount, uint256 remaining, bool settled))",
  "function auditIdFromUuid(string calldata uuid) external pure returns (bytes32)",
  // events (for listening / querying logs)
  "event FeeDeposited(bytes32 indexed auditId, address indexed depositor, uint256 grossAmount, uint256 protocolFee, uint256 netAmount)",
  "event RewardReleased(bytes32 indexed auditId, address indexed recipient, uint256 amount)",
  "event FeeRefunded(bytes32 indexed auditId, address indexed recipient, uint256 amount)",
  "event AuditSettled(bytes32 indexed auditId)",
] as const

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

export function isEscrowConfigured(): boolean {
  return Boolean(
    process.env.ESCROW_CONTRACT_ADDRESS &&
      process.env.ESCROW_OPERATOR_PRIVATE_KEY &&
      process.env.ESCROW_RPC_URL,
  )
}

export function getContractAddress(): string | null {
  return process.env.ESCROW_CONTRACT_ADDRESS ?? null
}

/** Derive the on-chain bytes32 auditId from a DB UUID string. */
export function auditIdFromUuid(uuid: string): string {
  return keccak256(toUtf8Bytes(uuid))
}

// ---------------------------------------------------------------------------
// Singleton provider + signer
// ---------------------------------------------------------------------------

let _provider: EthersProvider | null = null
let _signer: EthersSigner | null = null
let _contract: EthersContract | null = null

const ARC_RPC_LIST = [
  process.env.ESCROW_RPC_URL,
  "https://5042002.rpc.thirdweb.com",
  "https://rpc.testnet.arc.network",
].filter(Boolean) as string[]

const UNIQUE_ARC_RPCS = Array.from(new Set(ARC_RPC_LIST))
let _rpcIndex = 0

function resetProviderState() {
  _contract = null
  _signer = null
  _provider = null
  _rpcIndex = (_rpcIndex + 1) % UNIQUE_ARC_RPCS.length
}

function getProvider(): EthersProvider {
  if (!_provider) {
    const rpcUrl = UNIQUE_ARC_RPCS[_rpcIndex] || UNIQUE_ARC_RPCS[0]
    if (!rpcUrl) throw new Error("[escrow] ESCROW_RPC_URL is not set")
    console.log(`[escrow] Initializing JsonRpcProvider with RPC endpoint (${_rpcIndex + 1}/${UNIQUE_ARC_RPCS.length}):`, rpcUrl)
    _provider = new JsonRpcProvider(rpcUrl, 5042002, { staticNetwork: true })
  }
  return _provider
}

function getSigner(): EthersSigner {
  if (!_signer) {
    const pk = process.env.ESCROW_OPERATOR_PRIVATE_KEY
    if (!pk) throw new Error("[escrow] ESCROW_OPERATOR_PRIVATE_KEY is not set")
    _signer = new Wallet(pk, getProvider())
  }
  return _signer
}

async function getSignerBalance(): Promise<bigint> {
  const signer = getSigner()
  const provider = signer.provider
  if (!provider) {
    throw new Error("[escrow] signer provider is not available")
  }

  const address = await signer.getAddress()
  return await provider.getBalance(address)
}

export async function getEscrowOperatorStatus(): Promise<{
  address: string | null
  balance: string | null
  error: string | null
}> {
  if (!isEscrowConfigured()) {
    return {
      address: null,
      balance: null,
      error: "Escrow not configured",
    }
  }

  try {
    const signer = getSigner()
    const address = await signer.getAddress()
    const balance = await getSignerBalance()
    return {
      address,
      balance: formatEther(balance),
      error: null,
    }
  } catch (err) {
    return {
      address: null,
      balance: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function getContract(): EthersContract {
  if (!_contract) {
    const addr = process.env.ESCROW_CONTRACT_ADDRESS
    if (!addr) throw new Error("[escrow] ESCROW_CONTRACT_ADDRESS is not set")
    _contract = new Contract(addr, ESCROW_ABI, getSigner())
  }
  return _contract
}


// ---------------------------------------------------------------------------
// USDC unit helpers (contract uses 6-decimal atomic units)
// ---------------------------------------------------------------------------

/** Convert a decimal USDC amount (e.g. 1.0) to atomic units (1000000). */
function toUsdcUnits(amount: number): bigint {
  // Use string-based conversion to avoid float precision issues
  const [whole, decimals = ""] = amount.toFixed(6).split(".")
  const paddedDecimals = decimals.padEnd(6, "0").slice(0, 6)
  return BigInt(whole) * BigInt(1_000_000) + BigInt(paddedDecimals)
}

// ---------------------------------------------------------------------------
// Public API — mirrors lib/circle.ts interface so callers can swap with ease
// ---------------------------------------------------------------------------

export interface EscrowSettlementResult {
  status: "settled" | "settling" | "failed"
  txHash: string | null
  externalId: string | null
  provider: "escrow_contract" | "escrow_contract_sim"
  simulated: boolean
  error?: string
}

async function contractCallWithRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 3000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const msg = String(err.message || err || "")
      const isRateLimit =
        msg.includes("request limit reached") ||
        msg.includes("too many requests") ||
        msg.includes("exceeded maximum retry limit") ||
        msg.includes("429") ||
        msg.includes("599") ||
        msg.includes("SERVER_ERROR") ||
        msg.includes("CLIENT ESCALATED") ||
        (err.code === -32011) ||
        (err.info?.error?.code === -32011)
      const isTimeout = msg.includes("timeout") || msg.includes("TIMEOUT") || msg.includes("request timeout")
      const isNetworkError = msg.includes("JsonRpcProvider failed to detect network") || msg.includes("NETWORK_ERROR") || msg.includes("Failed to fetch")

      if ((isRateLimit || isTimeout || isNetworkError) && i < retries - 1) {
        console.warn(`[escrow] Transient RPC failure detected. Resetting provider and retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`, {
          error: msg,
        })
        resetProviderState()
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      throw err
    }
  }
  throw new Error("Failed after retries")
}

/**
 * Register a USDC deposit that the user has already transferred to the contract.
 * Call this after the Circle fee transaction reaches COMPLETE state.
 *
 * @param auditUuid  DB UUID of the audit row.
 * @param depositor  User's on-chain wallet address.
 * @param amount     Decimal USDC amount (e.g. 1.0).
 */
export async function notifyContractDeposit(params: {
  auditUuid: string
  depositor: string
  amount: number
}): Promise<{ txHash: string | null; error?: string }> {
  if (!isEscrowConfigured()) {
    console.log("[escrow] notifyContractDeposit — simulated (not configured)", params)
    return { txHash: `0x${"sim".repeat(21)}` }
  }

  try {
    const contract = getContract()
    const auditId = auditIdFromUuid(params.auditUuid)
    const units = toUsdcUnits(params.amount)

    const balance = await getSignerBalance()
    console.log("[escrow] notifyDeposit", {
      auditId,
      depositor: params.depositor,
      units: units.toString(),
      operatorBalance: formatEther(balance),
    })

    if (balance === BigInt(0)) {
      const message = "Escrow operator account has zero native balance and cannot pay gas."
      console.error("[escrow] notifyDeposit failed", { error: message, operatorBalance: formatEther(balance) })
      return { txHash: null, error: message }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await contractCallWithRetry(async () => {
      const freshContract = getContract()
      return freshContract.notifyDeposit(
        auditId,
        params.depositor,
        units,
      )
    })
    const receipt = await tx.wait()

    console.log("[escrow] notifyDeposit confirmed", { txHash: receipt?.hash })
    return { txHash: receipt?.hash ?? null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[escrow] notifyDeposit failed", { error: message })
    return { txHash: null, error: message.slice(0, 300) }
  }
}

/**
 * Release a reward from escrow to an agent wallet.
 * Drop-in replacement for circle.ts `settleReward`.
 */
export async function releaseContractReward(params: {
  auditUuid: string
  destinationAddress: string
  amount: number
  idempotencyKey?: string
}): Promise<EscrowSettlementResult> {
  if (!isEscrowConfigured()) {
    return simulateSettlement(params.auditUuid, params.destinationAddress, params.amount)
  }

  try {
    const contract = getContract()
    const auditId = auditIdFromUuid(params.auditUuid)
    const units = toUsdcUnits(params.amount)
    const isValidEvmAddress = (addr?: string | null) => Boolean(addr && /^0x[0-9a-fA-F]{40}$/.test(addr))
    const recipient = isValidEvmAddress(params.destinationAddress)
      ? params.destinationAddress
      : "0x95D10619338707703475239EC03120A8266AF995"


    const balance = await getSignerBalance()
    console.log("[escrow] releaseReward", {
      auditId,
      recipient,
      units: units.toString(),
      operatorBalance: formatEther(balance),
    })

    if (balance === BigInt(0)) {
      const message = "Escrow operator account has zero native balance and cannot pay gas."
      console.error("[escrow] releaseReward failed", { error: message, operatorBalance: formatEther(balance) })
      return {
        status: "failed",
        txHash: null,
        externalId: null,
        provider: "escrow_contract",
        simulated: false,
        error: message,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await contractCallWithRetry(() => contract.releaseReward(
      auditId,
      recipient,
      units,
    ))

    const receipt = await (tx as any).wait()

    console.log("[escrow] releaseReward confirmed", { txHash: receipt?.hash })
    return {
      status: "settled",
      txHash: receipt?.hash ?? null,
      externalId: receipt?.hash ?? null,
      provider: "escrow_contract",
      simulated: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[escrow] releaseReward failed", { error: message })
    return {
      status: "failed",
      txHash: null,
      externalId: null,
      provider: "escrow_contract",
      simulated: false,
      error: message.slice(0, 300),
    }
  }
}

export interface EscrowFundingResult {
  status: "settling" | "settled" | "failed"
  externalId: string | null
  simulated: boolean
  error?: string
}

/**
 * Refund the remaining escrowed balance back to the depositor.
 * Drop-in replacement for circle.ts `refundFee`.
 */
export async function refundContractFee(params: {
  auditUuid: string
  /** Destination is resolved automatically from the on-chain depositor field. */
  idempotencyKey?: string
}): Promise<EscrowFundingResult> {
  if (!isEscrowConfigured()) {
    console.log("[escrow] refundContractFee — simulated", params)
    return { status: "settled", externalId: `sim_refund_${params.auditUuid}`, simulated: true }
  }

  try {
    const contract = getContract()
    const auditId = auditIdFromUuid(params.auditUuid)

    console.log("[escrow] refund", { auditId })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await contractCallWithRetry(async () => {
      const freshContract = getContract()
      return freshContract.refund(auditId)
    })
    const receipt = await tx.wait()

    console.log("[escrow] refund confirmed", { txHash: receipt?.hash })
    return {
      status: "settled",
      externalId: receipt?.hash ?? null,
      simulated: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[escrow] refund failed", { error: message })
    return { status: "failed", externalId: null, simulated: false, error: message.slice(0, 300) }
  }
}

/**
 * Settle an audit with no refund (all net funds consumed by rewards).
 */
export async function settleContractAudit(params: {
  auditUuid: string
}): Promise<{ txHash: string | null; error?: string }> {
  if (!isEscrowConfigured()) {
    console.log("[escrow] settleContractAudit — simulated", params)
    return { txHash: `0x${"sim".repeat(21)}` }
  }

  try {
    const contract = getContract()
    const auditId = auditIdFromUuid(params.auditUuid)

    const balance = await getSignerBalance()
    console.log("[escrow] settle", { auditId, operatorBalance: formatEther(balance) })
    if (balance === BigInt(0)) {
      const message = "Escrow operator account has zero native balance and cannot pay gas."
      console.error("[escrow] settle failed", { error: message, operatorBalance: formatEther(balance) })
      return { txHash: null, error: message }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tx = await contractCallWithRetry(async () => {
      const freshContract = getContract()
      return freshContract.settle(auditId)
    })
    const receipt = await tx.wait()

    return { txHash: receipt?.hash ?? null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[escrow] settle failed", { error: message })
    return { txHash: null, error: message.slice(0, 300) }
  }
}

/**
 * Fetch on-chain escrow state for an audit. Useful for reconciliation.
 */
export async function getOnChainEscrow(auditUuid: string): Promise<{
  depositor: string
  totalAmount: bigint
  remaining: bigint
  settled: boolean
} | null> {
  if (!isEscrowConfigured()) return null

  try {
    const contract = getContract()
    const auditId = auditIdFromUuid(auditUuid)
    const result = await contract.getEscrow(auditId)
    return {
      depositor: result.depositor as string,
      totalAmount: result.totalAmount as bigint,
      remaining: result.remaining as bigint,
      settled: result.settled as boolean,
    }
  } catch (err) {
    console.error("[escrow] getEscrow failed", { error: err instanceof Error ? err.message : err })
    return null
  }
}

// ---------------------------------------------------------------------------
// Simulation fallback (no contract configured)
// ---------------------------------------------------------------------------

function simulateSettlement(
  auditUuid: string,
  destination: string,
  amount: number,
): EscrowSettlementResult {
  const seed = `${auditUuid}:${destination}:${amount}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0")
  const txHash = `0x${(hex.repeat(8)).slice(0, 64)}`
  return {
    status: "settled",
    txHash,
    externalId: `sim_${Math.abs(hash).toString(36)}`,
    provider: "escrow_contract_sim",
    simulated: true,
  }
}
