import "server-only"

import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets"

/**
 * Circle USER-controlled wallet integration.
 *
 * Each application user gets their own non-custodial Circle wallet secured by a
 * PIN/passkey. Server-side we register the user, mint short-lived user tokens,
 * and create challenges (PIN setup + wallet creation, and fee transfers). The
 * actual signing happens in the browser via the W3S Web SDK, which consumes the
 * `challengeId` + `userToken` + `encryptionKey` returned here.
 *
 * The wallet lives on the same blockchain as the treasury wallet (Arc testnet).
 */

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

// Wallets are created on the same chain as the treasury wallet. Arc testnet.
export const USER_WALLET_BLOCKCHAIN = (process.env.CIRCLE_BLOCKCHAIN ?? "ARC-TESTNET") as never

export function isCircleUserConfigured(): boolean {
  return Boolean(CIRCLE_API_KEY && process.env.CIRCLE_APP_ID)
}

let userClient: ReturnType<typeof initiateUserControlledWalletsClient> | null = null

function getUserClient() {
  if (!userClient) {
    userClient = initiateUserControlledWalletsClient({ apiKey: CIRCLE_API_KEY! })
  }
  return userClient
}

/** Register a user with Circle. Idempotent: ignores "already exists" errors. */
export async function createCircleUser(userId: string): Promise<void> {
  const client = getUserClient()
  try {
    await client.createUser({ userId })
  } catch (err) {
    // 409 = user already exists, which is fine.
    const message = err instanceof Error ? err.message : ""
    if (!message.includes("409") && !/exist/i.test(message)) throw err
  }
}

export interface UserSession {
  userToken: string
  encryptionKey: string
}

/** Mint a short-lived user token + encryption key used by the browser SDK. */
export async function createUserSession(userId: string): Promise<UserSession> {
  const client = getUserClient()
  const res = await client.createUserToken({ userId })
  const userToken = res.data?.userToken
  const encryptionKey = res.data?.encryptionKey
  if (!userToken || !encryptionKey) {
    throw new Error("Circle did not return a user token")
  }
  return { userToken, encryptionKey }
}

/** Read a user's status (e.g. whether they've completed PIN/wallet setup). */
export async function getCircleUserStatus(userToken: string): Promise<string | null> {
  const client = getUserClient()
  try {
    const res = await client.getUserStatus({ userToken })
    return res.data?.status ?? null
  } catch {
    return null
  }
}

/**
 * Create the PIN-setup + wallet-creation challenge. The returned challengeId is
 * executed in the browser by the Web SDK, which prompts the user to set a PIN
 * and provisions their wallet on Arc testnet.
 */
export async function createWalletSetupChallenge(userToken: string): Promise<string> {
  const client = getUserClient()
  const res = await client.createUserPinWithWallets({
    userToken,
    blockchains: [USER_WALLET_BLOCKCHAIN],
    accountType: "SCA",
  })
  const challengeId = res.data?.challengeId
  if (!challengeId) throw new Error("Circle did not return a wallet setup challenge")
  return challengeId
}

export interface UserWalletInfo {
  walletId: string
  address: string
  blockchain: string
  state: string
}

/** List the user's wallets (after setup completes). Returns the first one. */
export async function getUserWallet(userToken: string): Promise<UserWalletInfo | null> {
  const client = getUserClient()
  const res = await client.listWallets({ userToken })
  const wallet = res.data?.wallets?.[0]
  if (!wallet) return null
  return {
    walletId: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    state: wallet.state,
  }
}

/** Get the USDC balance (decimal string) for a user wallet. */
export async function getUserUsdcBalance(
  userToken: string,
  walletId: string,
): Promise<{ amount: string; tokenId: string | null }> {
  const client = getUserClient()
  const res = await client.getWalletTokenBalance({ userToken, walletId })
  const balances = res.data?.tokenBalances ?? []
  const usdc = balances.find((b) => b.token?.symbol?.toUpperCase().includes("USDC"))
  return { amount: usdc?.amount ?? "0", tokenId: usdc?.token?.id ?? null }
}

export interface FeeChallenge {
  challengeId: string
  transactionId: string | null
}

/**
 * Create a USDC transfer challenge from the user's wallet to the treasury.
 * The browser SDK executes the challenge (PIN prompt) to authorize the fee.
 */
export async function createFeeTransferChallenge(params: {
  userToken: string
  walletId: string
  tokenId: string
  amount: number
  destinationAddress: string
  idempotencyKey: string
}): Promise<FeeChallenge> {
  const client = getUserClient()
  try {
    const res = await client.createTransaction({
      userToken: params.userToken,
      walletId: params.walletId,
      tokenId: params.tokenId,
      destinationAddress: params.destinationAddress,
      amounts: [params.amount.toFixed(6)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: params.idempotencyKey,
    })

    return {
      challengeId: res.data?.challengeId ?? "",
      transactionId: null,
    }
  } catch (err) {
    try {
      console.error("Circle createTransaction error", {
        userToken: params.userToken,
        walletId: params.walletId,
        tokenId: params.tokenId,
        destinationAddress: params.destinationAddress,
        amounts: [params.amount.toFixed(6)],
        idempotencyKey: params.idempotencyKey,
        error: err instanceof Error ? err.message : err,
        response: (err as any)?.response ?? null,
      })
    } catch (logErr) {
      console.error("Failed logging createTransaction error", logErr)
    }
    throw err
  }
}

export async function getUserChallenge(
  userToken: string,
  challengeId: string,
): Promise<{ status: string | null; correlationIds: string[] | null } | null> {
  const client = getUserClient()
  try {
    const res = await client.getUserChallenge({ userToken, challengeId })
    const challenge = res.data?.challenge
    if (!challenge) return null
    return {
      status: challenge.status ?? null,
      correlationIds: challenge.correlationIds ?? null,
    }
  } catch {
    return null
  }
}

/** Look up a user-wallet transaction state for reconciliation. */
export async function getUserTransaction(
  userToken: string,
  transactionId: string,
): Promise<{ state: string; txHash: string | null } | null> {
  const client = getUserClient()
  try {
    const res = await client.getTransaction({ userToken, id: transactionId })
    const tx = res.data?.transaction
    if (!tx) return null
    return { state: tx.state ?? "UNKNOWN", txHash: tx.txHash ?? null }
  } catch {
    return null
  }
}
