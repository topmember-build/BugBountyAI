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

  const selectedAgentIds = (() => {
    const ids = body.agent_ids as string | Array<unknown> | undefined
    if (typeof ids === "string") {
      return ids
        .split(",")
        .map((id) => id.trim())
        .filter((id): id is string => id.length > 0)
    }
    if (Array.isArray(ids)) {
      return ids
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
    }
    return []
  })()

  const selectedAgentTypes = (() => {
    const agents = body.agents as string | Array<unknown> | undefined
    const validTypes: AgentType[] = ["security", "logic", "dependency", "smart_contract"]
    if (typeof agents === "string") {
      return agents
        .split(",")
        .map((agent) => agent.trim())
        .filter((agent): agent is AgentType => validTypes.includes(agent as AgentType))
    }
    if (Array.isArray(agents)) {
      return agents.filter(
        (agent): agent is AgentType => typeof agent === "string" && validTypes.includes(agent as AgentType),
      )
    }
    return []
  })()

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

    console.log("[audit] inline processing started", {
      auditFeeId: feeRow.id,
      userId: user.id,
      repoUrl,
      branch: body.branch?.trim() || "main",
      selectedAgentIds: selectedAgentIds.length,
      selectedAgentTypes: selectedAgentTypes.length,
    })

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

      console.log("[bridge] transferFromDeveloperWallet result", transferResult)

      if (transferResult.transactionId) {
        currentRefundExternalId = transferResult.transactionId
        await admin
          .from("audit_fees")
          .update({ refund_external_id: transferResult.transactionId })
          .eq("id", feeRow.id)
      } else {
        return NextResponse.json(
          { error: `Failed to bridge fee to contract: ${transferResult.error ?? "unknown error"}`, bridgeStatus: "bridge_failed" },
          { status: 500 },
        )
      }
    }

    // Poll for the Dev -> Contract transfer to settle
    let lastBridgeStatus: string | null = null
    if (currentRefundExternalId) {
      console.log("[bridge] Polling Dev -> Contract transfer status:", currentRefundExternalId)
      for (let attempt = 0; attempt < 8; attempt++) {
        const devStatus = await getTransactionStatus(currentRefundExternalId)
        lastBridgeStatus = devStatus?.status ?? "unknown"
        console.log("[bridge] Poll attempt", attempt + 1, { devStatus })
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
        {
          error: "The fee bridging transaction is still pending or failed. Please wait a few seconds and try again.",
          bridgeStatus: lastBridgeStatus,
          bridgeExternalId: currentRefundExternalId,
        },
        { status: 202 }
      )
    }

    const branch = body.branch?.trim() || "main"

    const selectedAgentsForAnalysis: Array<AgentType | { agent_type: AgentType; name: string; system_prompt?: string | null; focus_areas?: string | null }> = []

    if (selectedAgentIds.length > 0) {
      const validSelectedAgentIds = Array.from(new Set(selectedAgentIds.map((id) => id.trim()).filter(Boolean)))
      if (validSelectedAgentIds.length === 0) {
        return NextResponse.json(
          { error: "Unable to load selected agents: invalid agent IDs provided." },
          { status: 400 },
        )
      }

      const isUuid = (value: string) =>
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)

      const uuidAgentIds = validSelectedAgentIds.filter(isUuid)
      const slugAgentIds = validSelectedAgentIds
        .filter((id) => !isUuid(id))
        .flatMap((id) => (id.startsWith("default-") ? [id, id.replace(/^default-/, "")] : [id]))
      const selectedAgentRows: Array<{ id: string; name: string; agent_type: AgentType; system_prompt?: string | null; focus_areas?: string | null }> = []

      if (uuidAgentIds.length > 0) {
        const { data: uuidRows, error: uuidError } = await admin
          .from("agents")
          .select("id, name, agent_type, system_prompt, focus_areas")
          .in("id", uuidAgentIds)

        if (uuidError) {
          console.error("Failed to load selected agents by uuid", {
            error: uuidError,
            selectedAgentIds: uuidAgentIds,
          })
          return NextResponse.json(
            {
              error: "Unable to load selected agents",
              details: uuidError.message ?? String(uuidError),
            },
            { status: 500 },
          )
        }

        selectedAgentRows.push(...(uuidRows ?? []))
      }

      if (slugAgentIds.length > 0) {
        const uniqueSlugIds = Array.from(new Set(slugAgentIds))
        const { data: slugRows, error: slugError } = await admin
          .from("agents")
          .select("id, name, agent_type, system_prompt, focus_areas")
          .in("slug", uniqueSlugIds)

        if (slugError) {
          console.error("Failed to load selected agents by slug", {
            error: slugError,
            selectedAgentIds: uniqueSlugIds,
          })
          return NextResponse.json(
            {
              error: "Unable to load selected agents",
              details: slugError.message ?? String(slugError),
            },
            { status: 500 },
          )
        }

        selectedAgentRows.push(...(slugRows ?? []))
      }

      if (selectedAgentRows.length === 0) {
        return NextResponse.json(
          { error: "Unable to resolve selected agents. Please choose valid registered agents." },
          { status: 400 },
        )
      }

      const seenAgentIds = new Set<string>()
      for (const agentRow of selectedAgentRows) {
        if (!agentRow.agent_type || seenAgentIds.has(agentRow.id)) continue
        seenAgentIds.add(agentRow.id)
        selectedAgentsForAnalysis.push({
          agent_type: agentRow.agent_type,
          name: agentRow.name,
          system_prompt: agentRow.system_prompt ?? null,
          focus_areas: agentRow.focus_areas ?? null,
        })
      }
    } else if (selectedAgentTypes.length > 0) {
      selectedAgentsForAnalysis.push(...selectedAgentTypes)
    }

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

    if (body.contract_code) {
      auditPayload.contract_code = body.contract_code
    }

    if (body.contract_filename) {
      auditPayload.contract_filename = body.contract_filename
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
      await admin.from("audit_fees").update({ status: "used" }).eq("id", feeRow.id)

      if (feeRow.source_address) {
        const depositResult = await notifyContractDeposit({
          auditUuid: feeRow.id,
          depositor: feeRow.source_address,
          amount: Number(feeRow.amount ?? 1),
        })
        if (depositResult.error) {
          console.warn("[escrow] audit route: notifyContractDeposit failed (non-fatal)", depositResult.error)
        }
      }

      const analysis = await analyzeRepository({
        repoUrl: repoUrl || undefined,
        branch,
        contractCode: body.contract_code || undefined,
        contractFilename: body.contract_filename || undefined,
        archiveFilename: body.archive_filename || undefined,
        selectedAgents: selectedAgentsForAnalysis,
      })

      const { data: agents } = await admin
        .from("agents")
        .select("id, slug, agent_type, wallet_address, onchain_agent_id, onchain_registry_address")

      const agentByType = new Map()
      for (const a of (agents || [])) {
        if (!a.agent_type || agentByType.has(a.agent_type)) continue
        agentByType.set(a.agent_type, {
          id: a.id,
          wallet_address: a.wallet_address ?? null,
          onchain_agent_id: a.onchain_agent_id ?? null,
          onchain_registry_address: a.onchain_registry_address ?? null,
        })
      }

      let totalReward = 0
      const findingsToInsert = []
      const rewardMeta = []

      for (const finding of analysis.findings) {
        const reward = calculateReward(finding.severity, finding.confidence)
        totalReward += reward
        const agent = agentByType.get(finding.agent_type) ?? null
        const destinationAddress = agent?.wallet_address ?? null

        findingsToInsert.push({
          audit_id: audit.id,
          user_id: user.id,
          agent_id: agent?.id ?? null,
          title: finding.title,
          severity: finding.severity,
          confidence: finding.confidence,
          category: finding.category,
          file_path: finding.file_path,
          line_start: finding.line_start || null,
          line_end: finding.line_end || null,
          description: finding.description,
          recommendation: finding.recommendation,
          reward_amount: reward,
          reward_status: "pending",
        })

        rewardMeta.push({
          agentId: agent?.id ?? null,
          destinationAddress,
          rewardAmount: reward,
          registryAddress: agent?.onchain_registry_address ?? null,
          severity: finding.severity,
        })
      }

      const { data: insertedFindings, error: findingsError } = await admin.from("findings").insert(findingsToInsert).select()
      if (findingsError) throw findingsError

      for (let idx = 0; idx < (insertedFindings?.length ?? 0); idx++) {
        const finding = insertedFindings[idx]
        const meta = rewardMeta[idx]
        const rewardAmount = Number(finding.reward_amount ?? 0)
        const agentId = meta.agentId
        const destinationAddress = meta.destinationAddress
        let rewardStatus: "pending" | "settling" | "settled" | "failed" = "failed"
        let provider = "unknown"
        let txHash = null
        let externalId = null
        let settledAt = null

        if (destinationAddress && rewardAmount > 0) {
          const settlement = await settleReward({
            auditUuid: feeRow.id,
            destinationAddress,
            amount: rewardAmount,
            idempotencyKey: `${feeRow.id}:${finding.id}`,
          })

          rewardStatus = settlement.status
          provider = settlement.provider
          txHash = settlement.txHash
          externalId = settlement.externalId
          if (settlement.status === "settled") {
            settledAt = new Date().toISOString()
          }
        } else {
          console.warn("[audit] Missing destination wallet or reward amount for finding", {
            findingId: finding.id,
            agentId,
            destinationAddress,
            rewardAmount,
          })
        }

        const { error: rewardError } = await admin.from("rewards").insert([
          {
            finding_id: finding.id,
            user_id: user.id,
            agent_id: agentId,
            amount: rewardAmount,
            currency: "USDC",
            status: rewardStatus,
            provider,
            tx_hash: txHash,
            external_id: externalId,
            settled_at: settledAt,
          },
        ])
        if (rewardError) throw rewardError

        await admin.from("findings").update({ reward_status: rewardStatus }).eq("id", finding.id)

        if (rewardStatus === "settled" && agentId) {
          await updateAgentReputation({
            agentId,
            registryAddress: meta.registryAddress ?? null,
            delta: severityReputation(meta.severity),
          })
          await admin.rpc("increment_agent_stats", {
            p_agent_id: agentId,
            p_earned: rewardAmount,
            p_reputation: severityReputation(meta.severity),
          })
        }
      }

      const { error: auditUpdateError } = await admin
        .from("audits")
        .update({
          status: "completed",
          findings_count: insertedFindings?.length ?? 0,
          total_reward: totalReward,
          completed_at: new Date().toISOString(),
        })
        .eq("id", audit.id)

      if (auditUpdateError) {
        throw auditUpdateError
      }

      return NextResponse.json({ audit, findings: insertedFindings }, { status: 200 })
    } catch (processingError) {
      console.error("[audit] Inline processing failed", processingError)
      try {
        await admin.from("audits").update({ status: "failed" }).eq("id", audit.id)
      } catch (updateErr) {
        console.error("[audit] Failed to mark audit as failed", updateErr)
      }

      await refundAuditFee(feeRow, "audit_failed")
      return NextResponse.json(
        { error: processingError instanceof Error ? processingError.message : "Audit processing failed" },
        { status: 500 },
      )
    }
  } catch (verifyError) {
    return NextResponse.json(
      { error: verifyError instanceof Error ? verifyError.message : "Unable to verify fee transaction" },
      { status: 502 },
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
