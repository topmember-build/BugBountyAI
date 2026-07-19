import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeRepository } from "@/lib/analyzer"
import { calculateReward } from "@/lib/rewards"
import { refundFee, settleReward, getTransactionStatus, getTreasuryAddress, transferFromDeveloperWallet } from "@/lib/circle"
import { randomUUID } from "crypto"
import { notifyContractDeposit, settleContractAudit } from "@/lib/escrow-contract"
import { createCircleUser, createUserSession, getUserTransaction, getUserWallet } from "@/lib/circle-user"
import { updateAgentReputation } from "@/lib/agent-identity"
import type { AgentType } from "@/lib/types"

export const maxDuration = 120

// GET /api/audits — list the current user's audits
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("audits")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ audits: data })
}

// POST /api/audits — submit a repo, run the AI swarm, store findings, settle rewards
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUser = user

  const contentType = request.headers.get("content-type") || ""
  let body: {
    repo_url?: string
    branch?: string
    agents?: AgentType[]
    agent_ids?: string[]
    fee_transaction_id?: string
    archive_path?: string
    archive_filename?: string
    contract_code?: string
    contract_filename?: string
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    body = {
      repo_url: formData.get("repo_url") as string | undefined,
      branch: formData.get("branch") as string | undefined,
      fee_transaction_id: formData.get("fee_transaction_id") as string | undefined,
      archive_path: formData.get("archive_path") as string | undefined,
      archive_filename: formData.get("archive_filename") as string | undefined,
      contract_code: formData.get("contract_code") as string | undefined,
      contract_filename: formData.get("contract_filename") as string | undefined,
    }
  } else {
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
  }

  let repoUrl = body.repo_url?.trim()
  const contractCode = body.contract_code?.trim()
  const archivePath = body.archive_path?.trim()

  if (!repoUrl && !contractCode && !archivePath) {
    return NextResponse.json(
      { error: "At least one target (GitHub Repository, Smart Contract, or Project Folder) is required." },
      { status: 400 }
    )
  }

  // Populate placeholder repoUrl for the database if not provided
  if (!repoUrl) {
    if (contractCode) {
      repoUrl = body.contract_filename
        ? `Pasted Contract: ${body.contract_filename}`
        : "Pasted Smart Contract"
    } else if (archivePath) {
      repoUrl = body.archive_filename
        ? `Uploaded Project: ${body.archive_filename}`
        : "Uploaded Project Folder"
    } else {
      repoUrl = "Unknown Scan Target"
    }
  }

  const feeTransactionId = body.fee_transaction_id?.trim()
  if (!feeTransactionId) {
    return NextResponse.json({ error: "fee_transaction_id is required" }, { status: 400 })
  }

  const selectedAgentIds = Array.isArray(body.agent_ids)
    ? body.agent_ids.filter((id): id is string => typeof id === "string")
    : []

  const selectedAgentTypes = Array.isArray(body.agents)
    ? body.agents.filter(
        (agent): agent is AgentType =>
          ["security", "logic", "dependency", "smart_contract"].includes(agent),
      )
    : []

  async function updateFeeStatus(feeId: string, status: "refunded" | "refund_failed" | "used" | "settled") {
    // Preserve the original user `transaction_id` for auditing. Only update
    // the status field here — do not clear transaction ids which record the
    // user's payment to the treasury.
    const updatePayload: any = { status }
    const { error } = await admin.from("audit_fees").update(updatePayload).eq("id", feeId)

    if (error) {
      console.error("Failed to update audit fee status", { feeId, status, error })
      try {
        await supabase.from("audit_fees").update(updatePayload).eq("id", feeId)
      } catch (fallbackError) {
        console.error("Fallback fee status update also failed", { feeId, status, fallbackError })
      }
    }
  }

  async function resolveRefundDestinationAddress(feeRow?: { source_address?: string | null }): Promise<string | null> {
    console.log("[refund] Resolving refund destination address for user", { userId: currentUser.id, sourceAddress: feeRow?.source_address })
    
    // First priority: use the wallet address that originally paid the fee (if stored)
    if (feeRow?.source_address) {
      console.log("[refund] Using stored source_address from fee row", { address: feeRow.source_address })
      return feeRow.source_address
    }
    
    const { data: walletRow } = await supabase
      .from("user_wallets")
      .select("address")
      .eq("user_id", currentUser.id)
      .maybeSingle()

    if (walletRow?.address) {
      console.log("[refund] Found wallet address in user_wallets", { address: walletRow.address })
      return walletRow.address
    }

    console.log("[refund] No wallet in user_wallets, attempting Circle session")
    try {
      const session = await createUserSession(currentUser.id)
      console.log("[refund] Created user session", { userToken: session.userToken?.slice(0, 20) })
      const wallet = await getUserWallet(session.userToken)
      console.log("[refund] Retrieved wallet from Circle", { walletAddress: wallet?.address })
      if (wallet?.address) {
        await supabase.from("user_wallets").upsert({ user_id: currentUser.id, address: wallet.address })
        console.log("[refund] Saved wallet address to user_wallets")
        return wallet.address
      } else {
        console.warn("[refund] Circle session created but no wallet address returned")
      }
    } catch (walletError) {
      console.error("Unable to resolve refund wallet address from Circle", {
        userId: currentUser.id,
        feeTransactionId,
        error: walletError instanceof Error ? walletError.message : walletError,
      })
    }

    return null
  }

  async function refundAuditFee(
    feeRowToRefund: { id: string; amount?: number | string | null; source_address?: string | null } | null,
    reason: "no_audit_created" | "audit_failed" = "audit_failed",
  ) {
    if (!feeRowToRefund) return

    console.log("[refund] Initiating audit fee refund", {
      reason,
      feeId: feeRowToRefund.id,
      amount: feeRowToRefund.amount,
      sourceAddress: feeRowToRefund.source_address,
    })

    const destinationAddress = await resolveRefundDestinationAddress(feeRowToRefund)
    if (!destinationAddress) {
      console.warn("Audit fee refund could not resolve a destination wallet. Marking the fee as refunded for this failed/no-audit flow.", {
        userId: currentUser.id,
        feeTransactionId,
        reason,
      })
      await updateFeeStatus(feeRowToRefund.id, "refunded")
      return
    }

    try {
      const refundResult = await refundFee({
        destinationAddress,
        amount: Number(feeRowToRefund.amount || 1),
        idempotencyKey: feeRowToRefund.id,
      })

      // Persist refund external id + timestamp for traceability when Circle
      // returns an external transaction id.
      if (refundResult?.externalId) {
        try {
          await admin
            .from("audit_fees")
            .update({ refund_external_id: refundResult.externalId, refunded_at: new Date().toISOString() })
            .eq("id", feeRowToRefund.id)
        } catch (dbErr) {
          console.warn("Failed to persist refund metadata", { feeId: feeRowToRefund.id, err: dbErr })
        }
      }

      if (reason === "no_audit_created" || reason === "audit_failed") {
        await updateFeeStatus(feeRowToRefund.id, "refunded")
        console.warn("Audit fee refund attempted for failed/no-audit flow; marking fee row as refunded", {
          userId: currentUser.id,
          transactionId: feeTransactionId,
          reason,
          refundResult,
        })
        return
      }

      const nextStatus = refundResult.status === "settled" || refundResult.status === "settling"
        ? "refunded"
        : "refund_failed"

      await updateFeeStatus(feeRowToRefund.id, nextStatus)

      if (nextStatus === "refund_failed") {
        console.warn("Audit fee refund failed", {
          userId: currentUser.id,
          transactionId: feeTransactionId,
          reason,
          refundResult,
        })
      }
    } catch (refundError) {
      console.error("Audit fee refund threw an exception; marking the fee as refunded for the failed/no-audit flow", {
        userId: currentUser.id,
        transactionId: feeTransactionId,
        reason,
        refundError,
      })

      await updateFeeStatus(feeRowToRefund.id, "refunded")
    }
  }

  if (selectedAgentIds.length === 0 && selectedAgentTypes.length === 0) {
    if (feeTransactionId) {
      const { data: feeRow } = await admin
        .from("audit_fees")
        .select("id, amount, status, source_address")
        .eq("user_id", user.id)
        .eq("transaction_id", feeTransactionId)
        .in("status", ["authorized", "settled"])
        .maybeSingle()

      if (feeRow) {
        await refundAuditFee(feeRow, "no_audit_created")
      }
    }

    return NextResponse.json(
      { error: "Please select at least one registered agent or agent specialty." },
      { status: 400 },
    )
  }

  const { data: feeRow, error: feeError } = await admin
    .from("audit_fees")
    .select("id, amount, status, escrow_fee, net_amount, source_address, refund_external_id")
    .eq("user_id", user.id)
    .eq("transaction_id", feeTransactionId)
    .in("status", ["authorized", "settled", "pending"])
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (feeError || !feeRow) {
    return NextResponse.json(
      { error: "A valid authorized audit fee transaction is required." },
      { status: 400 },
    )
  }

  if (feeRow.status === "used") {
    return NextResponse.json(
      { error: "This audit fee has already been used for a previous audit. Authorize a new fee before submitting another audit." },
      { status: 400 },
    )
  }

  try {
    await createCircleUser(user.id)
    const session = await createUserSession(user.id)
    let state = null

    // Verify User -> Dev transaction is completed
    const tx = await getUserTransaction(session.userToken, feeTransactionId)
    state = tx?.state ?? null

    if (!state || state === "unknown") {
      const devStatus = await getTransactionStatus(feeTransactionId)
      if (devStatus) {
        state = devStatus.status === "settled" ? "COMPLETE" : devStatus.status === "failed" ? "FAILED" : "PENDING"
      }
    }

    const settledStates = new Set(["COMPLETE", "CONFIRMED", "SETTLED", "settled"])
    if (!state || !settledStates.has(String(state))) {
      return NextResponse.json(
        {
          error: `Fee transaction must be settled before submitting an audit. Current state: ${state ?? "unknown"}`,
        },
        { status: 400 },
      )
    }

    // Ensure the Dev -> Contract bridge is completed
    let isBridgeSettled = false
    let currentRefundExternalId = feeRow.refund_external_id

    if (!currentRefundExternalId) {
      const treasuryAddress = await getTreasuryAddress()
      if (!treasuryAddress) {
        return NextResponse.json({ error: "Escrow contract address not configured" }, { status: 500 })
      }

      console.log("[bridge] User -> Dev tx complete, initiating Dev -> Contract transfer inside audits route", {
        amount: feeRow.amount,
        destinationAddress: treasuryAddress,
      })

      const transferResult = await transferFromDeveloperWallet({
        destinationAddress: treasuryAddress,
        amount: Number(feeRow.amount ?? 1),
        idempotencyKey: randomUUID(),
      })

      if (transferResult.transactionId) {
        currentRefundExternalId = transferResult.transactionId
        await admin
          .from("audit_fees")
          .update({ refund_external_id: transferResult.transactionId })
          .eq("id", feeRow.id)
      } else {
        return NextResponse.json(
          { error: `Failed to bridge fee to contract: ${transferResult.error ?? "unknown error"}` },
          { status: 500 },
        )
      }
    }

    // Poll for the Dev -> Contract transfer to settle
    if (currentRefundExternalId) {
      console.log("[bridge] Polling Dev -> Contract transfer status:", currentRefundExternalId)
      for (let attempt = 0; attempt < 8; attempt++) {
        const devStatus = await getTransactionStatus(currentRefundExternalId)
        if (devStatus && devStatus.status === "settled") {
          console.log("[bridge] Dev -> Contract transfer settled successfully!")
          isBridgeSettled = true

          // Update DB status and refund tx hash
          await admin
            .from("audit_fees")
            .update({ status: "settled", refund_tx_hash: devStatus.txHash })
            .eq("id", feeRow.id)
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 2500))
      }
    }

    if (!isBridgeSettled) {
      return NextResponse.json(
        { error: "The fee bridging transaction is still pending or failed. Please wait a few seconds and try again." },
        { status: 202 }
      )
    }

    // We validated the fee and bridged funds. Create an audit row and
    // return immediately to avoid Vercel function timeouts. A background
    // worker should pick up queued audits with status 'queued' and
    // perform the heavy analysis / settlement work.
  } catch (verifyError) {
    return NextResponse.json(
      { error: verifyError instanceof Error ? verifyError.message : "Unable to verify fee transaction" },
      { status: 502 },
    )
  }

  const branch = body.branch?.trim() || "main"

  // 1. Create the audit row (status: queued) and return 202 Accepted
  const auditPayload: Record<string, unknown> = {
    user_id: user.id,
    repo_url: repoUrl,
    branch,
    status: "queued",
  }

  if (body.archive_path) {
    auditPayload.archive_path = body.archive_path
    auditPayload.archive_uploaded_at = new Date().toISOString()
  }

  if (body.archive_filename) {
    auditPayload.archive_filename = body.archive_filename
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert(auditPayload)
    .select()
    .single()

  if (auditError || !audit) {
    await refundAuditFee(feeRow, "no_audit_created")
    return NextResponse.json(
      { error: auditError?.message ?? "Failed to create audit" },
      { status: 500 },
    )
  }

  // Ensure storage bucket exists so workers can find any uploaded archives
  try {
    const { ensureStorageBucket } = await import("@/lib/supabase/init-storage")
    await ensureStorageBucket()
  } catch (e) {
    console.warn("Could not ensure storage bucket for audit requests", e)
  }

  // Respond quickly so the HTTP function doesn't time out; worker will
  // pick up audits with status 'queued' and perform the rest.
  return NextResponse.json({ audit: audit, message: "Audit queued for processing" }, { status: 202 })
  // Note: the heavy processing (analysis, inserting findings, settling
  // rewards, finalizing the audit) has been moved to a background worker.

}

function severityReputation(severity: string): number {
  switch (severity) {
    case "critical":
      return 40
    case "high":
      return 25
    case "medium":
      return 12
    case "low":
      return 5
    default:
      return 1
  }
}
