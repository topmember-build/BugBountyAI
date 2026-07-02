"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wallet } from "lucide-react"
import { W3SSdk } from "@circle-fin/w3s-pw-web-sdk"

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json())

interface WalletStatus {
  configured: boolean
  appId: string | null
  status: string | null
  wallet: {
    walletId: string
    address: string
    blockchain: string
  } | null
  balance: {
    amount: string
    tokenId: string | null
  } | null
  feeAmount: number
  treasuryAddress: string | null
  feeTransactionId?: string | null
  pendingChallengeId?: string | null
  userToken?: string | null
  encryptionKey?: string | null
}

interface WalletCardProps {
  onFeeAuthorized: (transactionId: string) => void
  feeTransactionId: string | null
  autoSetup?: boolean
}

export function WalletCard({ onFeeAuthorized, feeTransactionId, autoSetup = false }: WalletCardProps) {
  const { data, isLoading, mutate } = useSWR<WalletStatus>("/api/wallet", fetcher, {
    refreshInterval: 15000,
  })

  const [actionState, setActionState] = useState<"idle" | "setup" | "fee" | "success">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [faucetState, setFaucetState] = useState<"idle" | "sending" | "done">("idle")
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null)

  const canPayFee = Boolean(data?.wallet && data?.balance?.tokenId)
  const feeAmount = data?.feeAmount ?? 0
  const feePending = Boolean(data?.pendingChallengeId && !data?.feeTransactionId)
  const feeConsumed = Boolean(!data?.feeTransactionId && !feePending && data?.wallet)

  const runChallenge = async (payload: {
    appId: string
    userToken: string
    encryptionKey: string
    challengeId: string
  }) => {
    const sdk = new W3SSdk({
      appSettings: { appId: payload.appId },
    })

    sdk.setAuthentication({
      userToken: payload.userToken,
      encryptionKey: payload.encryptionKey,
    })
    return new Promise<any>((resolve, reject) => {
      sdk.execute(payload.challengeId, (error, result) => {
        if (error) {
          reject(new Error(error.message || "Wallet challenge failed"))
          return
        }

        if (!result || result.status === "FAILED") {
          reject(new Error("Wallet challenge did not complete successfully."))
          return
        }

        // Resolve with the SDK result; it may include a transactionId.
        resolve(result)
      })
    })
  }

  const confirmFeeTransaction = async (payload: { transactionId?: string; challengeId?: string; userToken?: string }) => {
    const res = await fetch("/api/wallet/fee/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.error ?? "Unable to confirm fee transaction")
    }
    return result
  }

  const verifyFeeTransaction = async (transactionId: string) => {
    const res = await fetch("/api/wallet/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId }),
    })
    const result = await res.json()
    if (!res.ok) {
      console.warn("Fee verification failed", result.error)
      return null
    }
    return result
  }

  const handleWalletSetup = async () => {
    if (!data?.configured) {
      setError("Circle wallet integration is not configured.")
      return
    }

    setError(null)
    setMessage(null)
    setActionState("setup")

    try {
      const res = await fetch("/api/wallet/setup", {
        method: "POST",
        credentials: "include",
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? "Unable to initialize wallet setup")

      await runChallenge(result)
      setMessage("Your wallet is ready. Refreshing status...")
      setActionState("success")
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet setup failed")
    } finally {
      setActionState("idle")
    }
  }

  const handleFeePayment = async () => {
    if (!data?.configured) {
      setError("Circle wallet integration is not configured.")
      return
    }

    if (!canPayFee) {
      setError("Unable to resolve your USDC wallet token. Check wallet configuration.")
      return
    }

    setError(null)
    setMessage(null)
    setActionState("fee")

    try {
      let transactionId: string | null = null
      let challengeId: string | null = null
      let result: any

      if (data?.pendingChallengeId) {
        if (!data.userToken || !data.encryptionKey) {
          throw new Error("Unable to resume pending fee challenge.")
        }

        result = {
          appId: data.appId,
          userToken: data.userToken,
          encryptionKey: data.encryptionKey,
          challengeId: data.pendingChallengeId,
        }
      } else {
        const res = await fetch("/api/wallet/fee", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })
        result = await res.json()
        if (!res.ok) throw new Error(result.error ?? "Unable to create fee challenge")
      }

      let sdkResult: any = null
      try {
        sdkResult = await runChallenge(result)
      } catch (err) {
        if (data?.pendingChallengeId && result?.challengeId) {
          console.warn("Existing pending challenge execution failed, attempting confirm for recovery", err)
        } else {
          throw err
        }
      }

      transactionId = sdkResult?.transactionId ?? result.transactionId ?? null
      challengeId = result.challengeId

      const confirmResult = await confirmFeeTransaction({
        transactionId: transactionId ?? undefined,
        challengeId: challengeId ?? undefined,
        userToken: result.userToken,
      })

      transactionId = confirmResult.transactionId ?? transactionId ?? null

      // If the confirm endpoint returned a new challenge (old one expired), execute it
      if (confirmResult.newChallenge && confirmResult.challengeId && confirmResult.userToken && confirmResult.encryptionKey) {
        setMessage("Challenge expired. Creating new fee challenge...")
        
        const newResult = {
          appId: confirmResult.appId || data.appId,
          userToken: confirmResult.userToken,
          encryptionKey: confirmResult.encryptionKey,
          challengeId: confirmResult.challengeId,
        }

        const newSdkResult = await runChallenge(newResult)
        transactionId = newSdkResult?.transactionId ?? confirmResult.transactionId ?? null
        challengeId = newResult.challengeId

        const newConfirmResult = await confirmFeeTransaction({
          transactionId: transactionId ?? undefined,
          challengeId: challengeId ?? undefined,
          userToken: newResult.userToken,
        })

        transactionId = newConfirmResult.transactionId ?? transactionId ?? null
      } else if (confirmResult.newChallenge) {
        setError("A new challenge was created but required data is missing. Please retry.")
        throw new Error("Incomplete new challenge response")
      }

      if (transactionId) {
        onFeeAuthorized(transactionId)
        setMessage("Audit fee authorized and persisted server-side.")
      } else {
        setMessage("Audit fee authorization submitted; awaiting server confirmation...")
      }

      setActionState("success")
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fee payment failed")
    } finally {
      setActionState("idle")
    }
  }

  const walletReady = Boolean(data?.wallet)
  const balanceAmount = data?.balance?.amount ?? "0"

  const [hasVerifiedFee, setHasVerifiedFee] = useState(false)

  useEffect(() => {
    if (autoSetup && !walletReady && data?.configured && actionState === "idle") {
      handleWalletSetup()
    }
  }, [autoSetup, walletReady, data?.configured, actionState])

  useEffect(() => {
    if (
      data?.feeTransactionId &&
      !feePending &&
      actionState === "idle" &&
      !hasVerifiedFee
    ) {
      setHasVerifiedFee(true)
      verifyFeeTransaction(data.feeTransactionId)
        .then((result) => {
          if (result?.status) {
            setMessage(`Fee transaction status: ${result.status}`)
          }
          mutate()
        })
        .catch((err) => {
          console.warn(err)
        })
    }
  }, [data?.feeTransactionId, feePending, actionState, hasVerifiedFee, mutate])

  useEffect(() => {
    if (!data?.feeTransactionId) {
      setHasVerifiedFee(false)
    }
  }, [data?.feeTransactionId])

  return (
    <section className="border border-border rounded-xl bg-card p-6 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Wallet & audit fee</h2>
          <p className="text-sm text-muted-foreground">
            Set up your Circle wallet and authorize the audit fee before scanning code.
          </p>
        </div>
        <Wallet className="w-6 h-6 text-primary" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 w-48 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded-full bg-muted" />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2 md:grid-cols-3 md:items-center">
            <span className="text-sm text-muted-foreground">Wallet status</span>
            <div className="md:col-span-2">
              <Badge variant="outline" className={walletReady ? "border-primary text-primary" : "border-muted text-muted-foreground"}>
                {walletReady ? data?.status ?? "active" : "not ready"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3 md:items-center">
            <span className="text-sm text-muted-foreground">USDC balance</span>
            <div className="md:col-span-2 text-sm">
              {walletReady ? `$${Number(balanceAmount).toFixed(2)} USDC` : "–"}
            </div>
          </div>

          {data?.wallet ? (
            <div className="grid gap-2 md:grid-cols-3 md:items-center">
              <span className="text-sm text-muted-foreground">Wallet address</span>
              <div className="md:col-span-2 text-sm break-all">{data.wallet.address}</div>
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-3 md:items-center">
            <span className="text-sm text-muted-foreground">Audit fee</span>
            <div className="md:col-span-2 text-sm">${feeAmount.toFixed(2)} USDC</div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          {message ? <div className="text-sm text-primary">{message}</div> : null}

          <div className="flex flex-wrap gap-3">
            {!walletReady ? (
              <Button
                onClick={handleWalletSetup}
                disabled={actionState !== "idle" || !data?.configured}
              >
                {actionState === "setup" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Setting up wallet...</>
                ) : (
                  "Set up wallet"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleFeePayment}
                disabled={actionState !== "idle" || !canPayFee}
              >
                {actionState === "fee" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Authorizing fee...</>
                ) : feeTransactionId ? (
                  "Fee authorized"
                ) : feePending ? (
                  "Resume fee authorization"
                ) : feeConsumed ? (
                  "Authorize a new audit fee"
                ) : (
                  "Authorize audit fee"
                )}
              </Button>
            )}
            {feeTransactionId ? (
              <Badge variant="secondary" className="h-9 px-3 rounded-full">
                Fee authorized
              </Badge>
            ) : feePending ? (
              <Badge variant="secondary" className="h-9 px-3 rounded-full">
                Pending fee challenge
              </Badge>
            ) : feeConsumed ? (
              <Badge variant="outline" className="h-9 px-3 rounded-full border-amber-500 text-amber-600">
                New fee required
              </Badge>
            ) : null}
          </div>
          {walletReady && (
            <div className="mt-3">
              <h3 className="text-sm font-medium mb-2">Circle testnet faucet</h3>
              <p className="text-sm text-muted-foreground mb-2">Request the default Circle testnet USDC drip for your wallet.</p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={async () => {
                    setFaucetState("sending")
                    setFaucetMessage(null)
                    setError(null)
                    try {
                      const res = await fetch("/api/faucet", { method: "POST", credentials: "include" })
                      const body = await res.json()
                      if (!res.ok) throw new Error(body.error ?? "Faucet request failed")
                      setFaucetMessage(body.message ?? (body.simulated ? "Circle faucet unavailable; local fallback used" : "Circle testnet USDC request submitted"))
                      setFaucetState("done")
                      await mutate()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Faucet failed")
                      setFaucetState("idle")
                    }
                  }}
                  disabled={faucetState === "sending"}
                >
                  {faucetState === "sending" ? (<><Loader2 className="w-4 h-4 animate-spin" /> Requesting...</>) : ("Get test USDC")}
                </Button>
                {faucetState === "done" && faucetMessage ? (
                  <Badge variant="secondary" className="h-9 px-3 rounded-full">{faucetMessage}</Badge>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
