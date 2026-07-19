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

    // Register the deposit on-chain with the smart contract escrow
    if (feeRow.source_address) {
      const depositResult = await notifyContractDeposit({
        auditUuid: feeRow.id, // fee row UUID -> on-chain auditId
        depositor: feeRow.source_address,
        amount: Number(feeRow.amount ?? 1),
      })
      if (depositResult.error) {
        console.warn("[escrow] notifyContractDeposit failed (non-fatal)", depositResult.error)
      }
    }
  } catch (verifyError) {
    return NextResponse.json(
      { error: verifyError instanceof Error ? verifyError.message : "Unable to verify fee transaction" },
      { status: 502 },
    )
  }

  const branch = body.branch?.trim() || "main"

  // 1. Create the audit row (status: scanning)
  const auditPayload: Record<string, unknown> = {
    user_id: user.id,
    repo_url: repoUrl,
    branch,
    status: "scanning",
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

  try {
    // 2. Run the AI audit swarm
    let selectedAgentRows:
      | Array<{
          id: string
          slug: string
          agent_type: AgentType
          system_prompt?: string | null
          focus_areas?: string | null
          name: string
          wallet_address?: string | null
          onchain_agent_id?: string | null
          onchain_registry_address?: string | null
        }>
      | undefined = undefined

    const validRegisteredAgentIds = selectedAgentIds.filter((id) => /^[0-9a-fA-F-]{8,}$/.test(id))

    if (validRegisteredAgentIds.length > 0) {
      const { data: foundAgents, error: agentLookupError } = await admin
        .from("agents")
        .select("id, slug, agent_type, system_prompt, focus_areas, name")
        .in("id", validRegisteredAgentIds)

      if (agentLookupError) {
        throw new Error(agentLookupError.message)
      }

      if (!foundAgents || foundAgents.length === 0) {
        console.warn("No registered agents matched the supplied IDs", { validRegisteredAgentIds })
      }

      selectedAgentRows = foundAgents ?? []
    }

    const analysisInput = [
      ...(selectedAgentRows ?? []),
      ...selectedAgentTypes,
    ]

    const analysis = await analyzeRepository({
      repoUrl,
      branch,
      contractCode: body.contract_code,
      contractFilename: body.contract_filename,
      archiveFilename: body.archive_filename,
      selectedAgents: analysisInput,
    })

    // 3. Map agent_type -> agent row (for attribution + leaderboard updates)
    const { data: agents } = await admin
      .from("agents")
      .select("id, slug, agent_type, wallet_address, onchain_agent_id, onchain_registry_address")

    const agentByType = new Map<
      string,
      { id: string; wallet_address: string | null; onchain_agent_id: string | null; onchain_registry_address: string | null }
    >()
    const agentRowsForMap = [...(selectedAgentRows ?? []), ...(agents ?? [])]
    for (const a of agentRowsForMap) {
      if (!a.agent_type || agentByType.has(a.agent_type)) continue
      agentByType.set(a.agent_type, {
        id: a.id,
        wallet_address: a.wallet_address ?? null,
        onchain_agent_id: (a as { onchain_agent_id?: string | null }).onchain_agent_id ?? null,
        onchain_registry_address: (a as { onchain_registry_address?: string | null }).onchain_registry_address ?? null,
      })
    }

    // 4. Build findings with calculated USDC rewards
    let totalReward = 0
    const findingsToInsert = analysis.findings.map((f) => {
      const reward = calculateReward(f.severity, f.confidence)
      totalReward += reward
      return {
        audit_id: audit.id,
        user_id: user.id,
        agent_id: agentByType.get(f.agent_type)?.id ?? null,
        title: f.title,
        severity: f.severity,
        confidence: f.confidence,
        category: f.category,
        file_path: f.file_path,
        line_start: f.line_start || null,
        line_end: f.line_end || null,
        description: f.description,
        recommendation: f.recommendation,
        reward_amount: reward,
        reward_status: "pending" as const,
      }
    })

    const { data: insertedFindings, error: findingsError } = await supabase
      .from("findings")
      .insert(findingsToInsert)
      .select()

    if (findingsError) {
      throw new Error(findingsError.message)
    }

    // 5. Settle rewards via Circle/Arc and record them
    // Payouts are sourced from the fee's net amount (base - escrow). Any remaining net
    // funds after paying findings will be refunded to the user.
    const feeBase = Number(feeRow.amount ?? 0)
    const feeEscrow = Number((feeRow as any).escrow_fee ?? 0)
    let remainingNet = Number((feeRow as any).net_amount ?? Math.max(0, feeBase - feeEscrow))

    let totalPaid = 0

    for (const finding of insertedFindings ?? []) {
      const requested = Number(finding.reward_amount)
      if (requested <= 0) continue

      const payout = Math.min(requested, remainingNet)
      if (payout <= 0) {
        // Not enough net funds left to pay this finding
        await supabase.from("findings").update({ reward_status: "insufficient_funds" }).eq("id", finding.id)
        await admin.from("rewards").insert({
          finding_id: finding.id,
          user_id: user.id,
          agent_id: finding.agent_id,
          amount: 0,
          status: "failed",
          provider: "insufficient_funds",
        })
        continue
      }

      const agentRow = (agents ?? []).find((a) => a.id === finding.agent_id)
      const destination = agentRow?.wallet_address ?? null
      if (!destination) {
        console.warn("[settlement] Agent wallet missing, cannot pay finding", {
          findingId: finding.id,
          agentId: finding.agent_id,
        })

        await supabase.from("findings").update({ reward_status: "failed" }).eq("id", finding.id)
        await admin.from("rewards").insert({
          finding_id: finding.id,
          user_id: user.id,
          agent_id: finding.agent_id,
          amount: 0,
          status: "failed",
          provider: "missing_agent_wallet",
        })

        continue
      }

      const settlement = await settleReward({
        amount: payout,
        destinationAddress: destination,
        // Pass the fee row id as idempotency key — escrow-contract.ts uses it
        // as the on-chain auditId via auditIdFromUuid(idempotencyKey).
        idempotencyKey: feeRow.id,
      })

      await supabase
        .from("findings")
        .update({ reward_status: settlement.status })
        .eq("id", finding.id)

      await admin.from("rewards").insert({
        finding_id: finding.id,
        user_id: user.id,
        agent_id: finding.agent_id,
        amount: payout,
        status: settlement.status,
        provider: settlement.provider,
        tx_hash: settlement.txHash,
        external_id: settlement.externalId,
        settled_at: settlement.status === "settled" ? new Date().toISOString() : null,
      })

      // Update leaderboard only for actually settled payments. For payments
      // still in "settling" state we defer the leaderboard increment to
      // the rewards reconciliation process so totals reflect settled USDC.
      if (finding.agent_id && agentRow && settlement.status === "settled") {
        try {
          await admin.rpc("increment_agent_stats", {
            p_agent_id: finding.agent_id,
            p_earned: payout,
            p_reputation: severityReputation(finding.severity),
          })
        } catch (err) {
          console.warn("Failed to rpc increment_agent_stats during audit settlement", { err })
        }
      }

      if (settlement.status === "settled" && finding.agent_id && agentRow) {
        await updateAgentReputation({
          agentId: agentRow.onchain_agent_id ?? null,
          registryAddress: agentRow.onchain_registry_address ?? null,
          delta: severityReputation(finding.severity),
        })
      }

      remainingNet = Number((remainingNet - payout).toFixed(6))
      totalPaid += payout
    }

    // Refund any leftover net amount back to the user. This must be durable;
    // if the refund cannot be completed we should surface that explicitly rather
    // than silently treating the fee as fully consumed.
    if (remainingNet > 0) {
      console.log("[refund] Attempting to refund leftover net amount", {
        feeId: feeRow.id,
        remainingNet,
        baseAmount: feeRow.amount,
        escrowFee: feeRow.escrow_fee,
      })
      try {
        const destinationAddress = await resolveRefundDestinationAddress(feeRow)
        if (!destinationAddress) {
          console.warn("[refund] Unable to resolve refund wallet for leftover net amount", { feeId: feeRow.id, remainingNet })
          await updateFeeStatus(feeRow.id, "refund_failed")
        } else {
          console.log("[refund] Calling refundFee with", {
            amount: remainingNet,
            destinationAddress: destinationAddress?.slice(0, 10) + "...",
            idempotencyKey: feeRow.id,
          })
          const refundResult = await refundFee({
            destinationAddress,
            amount: remainingNet,
            idempotencyKey: feeRow.id,
          })

          console.log("[refund] Refund result for leftover net amount", {
            feeId: feeRow.id,
            amount: remainingNet,
            refundStatus: refundResult.status,
            refundExternalId: refundResult.externalId,
            refundSimulated: refundResult.simulated,
            refundError: refundResult.error,
          })

          if (refundResult?.externalId) {
            try {
              await admin
                .from("audit_fees")
                .update({ refund_external_id: refundResult.externalId, refunded_at: new Date().toISOString() })
                .eq("id", feeRow.id)
            } catch (dbErr) {
              console.warn("Failed to persist refund metadata for leftover net", { feeId: feeRow.id, err: dbErr })
            }
          }

          if (refundResult.status === "settled" || refundResult.status === "settling") {
            console.log("[refund] Refund succeeded, marking fee as refunded")
            await updateFeeStatus(feeRow.id, "refunded")
          } else {
            console.log("[refund] Refund failed, marking fee as refund_failed")
            await updateFeeStatus(feeRow.id, "refund_failed")
          }
        }
      } catch (err) {
        console.error("[refund] Caught exception during refund attempt", { feeId: feeRow.id, error: err instanceof Error ? err.message : err })
        await updateFeeStatus(feeRow.id, "refund_failed")
      }
    } else {
      console.log("[refund] No leftover net to refund — settling escrow on-chain", { feeId: feeRow.id, remainingNet })
      // Settle the on-chain escrow slot so no further payments can be made
      await settleContractAudit({ auditUuid: feeRow.id }).catch((err) =>
        console.warn("[escrow] settleContractAudit failed (non-fatal)", err instanceof Error ? err.message : err),
      )
      await updateFeeStatus(feeRow.id, "used")
    }

    // 7. Finalize the audit (fee status already set in refund logic above)
    const { data: finalAudit, error: finalAuditError } = await supabase
      .from("audits")
      .update({
        status: "completed",
        repo_name: analysis.repoName,
        findings_count: insertedFindings?.length ?? 0,
        total_reward: totalReward,
        completed_at: new Date().toISOString(),
      })
      .eq("id", audit.id)
      .select()
      .single()

    if (finalAuditError || !finalAudit) {
      console.error("Failed to finalize audit status", { auditId: audit.id, finalAuditError })
      await supabase.from("audits").update({ status: "failed" }).eq("id", audit.id)
      throw new Error(finalAuditError?.message ?? "Failed to finalize audit")
    }

    return NextResponse.json({
      audit: finalAudit,
      summary: analysis.summary,
      findings_count: insertedFindings?.length ?? 0,
      total_reward: totalReward,
    })
  } catch (err) {
    if (audit?.id) {
      await supabase.from("audits").update({ status: "failed" }).eq("id", audit.id)
    }
    // Also pass the fee row id so refundFee -> refundContractFee can derive the correct auditId
    await refundAuditFee(feeRow, "audit_failed")
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 },
    )
  }
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
