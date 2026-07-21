import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { analyzeRepository } from "@/lib/analyzer"
import { calculateReward } from "@/lib/rewards"
import { refundFee, settleReward, isCircleConfigured } from "@/lib/circle"
import {
  isEscrowConfigured,
  notifyContractDeposit,
  settleContractAudit,
  getOnChainEscrow,
  refundContractFee,
} from "@/lib/escrow-contract"
import { updateAgentReputation } from "@/lib/agent-identity"
import type { AgentType } from "@/lib/types"

export interface ProcessAuditResult {
  success: boolean
  audit?: any
  error?: string
}

export async function processAuditInline(auditId: string): Promise<ProcessAuditResult> {
  const admin = createAdminClient()

  const { data: audit, error: fetchErr } = await admin
    .from("audits")
    .select("*")
    .eq("id", auditId)
    .maybeSingle()

  if (fetchErr || !audit) {
    return { success: false, error: fetchErr?.message || "Audit not found" }
  }

  if (audit.status === "completed") {
    return { success: true, audit }
  }

  console.log("[audit-processor] Starting inline audit processing", { auditId: audit.id })

  // Claim/mark as scanning
  const { data: claimedAudit, error: claimErr } = await admin
    .from("audits")
    .update({ status: "scanning", started_at: new Date().toISOString() })
    .eq("id", audit.id)
    .select()
    .single()

  if (claimErr || !claimedAudit) {
    console.error("[audit-processor] Failed to claim audit for scanning", claimErr)
    return { success: false, error: "Failed to set audit status to scanning" }
  }

  try {
    const auditUuid = claimedAudit.id

    let feeQuery = admin
      .from("audit_fees")
      .select("*")
      .eq("user_id", claimedAudit.user_id)

    if (claimedAudit.audit_fee_id) {
      feeQuery = feeQuery.eq("id", claimedAudit.audit_fee_id)
    } else {
      feeQuery = feeQuery
        .in("status", ["used", "authorized", "settled"])
        .order("created_at", { ascending: false })
        .limit(1)
    }

    const { data: feeRow } = await feeQuery.maybeSingle()

    if (feeRow && !claimedAudit.audit_fee_id) {
      await admin.from("audits").update({ audit_fee_id: feeRow.id }).eq("id", claimedAudit.id)
    }

    if (feeRow?.id && feeRow?.source_address) {
      console.log("[audit-processor] Registering contract deposit", { feeId: feeRow.id, auditUuid, sourceAddress: feeRow.source_address, amount: feeRow.amount })
      const depositResult = await notifyContractDeposit({
        auditUuid,
        depositor: feeRow.source_address,
        amount: Number(feeRow.amount ?? 1),
      })
      if (depositResult.error || !depositResult.txHash) {
        const errorReason = depositResult.error ?? "Escrow deposit did not return a transaction hash"
        const normalizedError = String(errorReason).toLowerCase()
        const gasOrRpcIssue =
          normalizedError.includes("zero native balance") ||
          normalizedError.includes("insufficient funds") ||
          normalizedError.includes("gas") ||
          normalizedError.includes("request limit reached") ||
          normalizedError.includes("rate limit") ||
          normalizedError.includes("32011")
        console.warn("[audit-processor] notifyContractDeposit failed", { error: errorReason, depositResult, gasOrRpcIssue })

        if (gasOrRpcIssue && isCircleConfigured()) {
          console.warn("[audit-processor] Continuing audit with Circle fallback because escrow deposit encountered an operator/RPC issue", { auditUuid, errorReason })
        } else {
          throw new Error(`Escrow deposit failed: ${errorReason}`)
        }
      }
    }


    const { data: agents } = await admin
      .from("agents")
      .select("id, slug, agent_type, wallet_address, onchain_agent_id, onchain_registry_address")

    const agentByType = new Map<string, {
      id: string
      wallet_address: string | null
      onchain_agent_id: string | null
      onchain_registry_address: string | null
    }>()

    for (const a of agents || []) {
      if (!a.agent_type || agentByType.has(a.agent_type)) continue
      agentByType.set(a.agent_type, {
        id: a.id,
        wallet_address: a.wallet_address ?? null,
        onchain_agent_id: a.onchain_agent_id ?? null,
        onchain_registry_address: a.onchain_registry_address ?? null,
      })
    }

    const rawAgentIds: string[] = Array.isArray(claimedAudit.selected_agent_ids)
      ? claimedAudit.selected_agent_ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : []
    const selectedAgentTypes: AgentType[] = Array.isArray(claimedAudit.selected_agent_types)
      ? claimedAudit.selected_agent_types.filter((type: unknown): type is AgentType => typeof type === "string" && type.trim().length > 0)
      : []

    const selectedAgentsForAnalysis: Array<AgentType | { agent_type: AgentType; name: string; system_prompt?: string | null; focus_areas?: string | null }> = []

    if (rawAgentIds.length > 0) {
      const validSelectedAgentIds: string[] = Array.from(new Set(rawAgentIds.map((id: string) => id.trim()).filter((id: string) => id.length > 0)))
      const isUuid = (value: string) =>
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)

      const uuidAgentIds: string[] = validSelectedAgentIds.filter((id: string) => isUuid(id))
      const slugAgentIds: string[] = validSelectedAgentIds
        .filter((id: string) => !isUuid(id))
        .flatMap((id: string) => (id.startsWith("default-") ? [id, id.replace(/^default-/, "")] : [id]))

      const selectedAgentRows: any[] = []
      if (uuidAgentIds.length > 0) {
        const { data: uuidRows, error: uuidError } = await admin
          .from("agents")
          .select("id, name, agent_type, system_prompt, focus_areas")
          .in("id", uuidAgentIds)

        if (uuidError) {
          throw new Error(`Failed to load selected agents by uuid: ${uuidError.message || String(uuidError)}`)
        }
        if (uuidRows) selectedAgentRows.push(...uuidRows)
      }

      if (slugAgentIds.length > 0) {
        const { data: slugRows, error: slugError } = await admin
          .from("agents")
          .select("id, name, agent_type, system_prompt, focus_areas")
          .in("slug", Array.from(new Set(slugAgentIds)))

        if (slugError) {
          throw new Error(`Failed to load selected agents by slug: ${slugError.message || String(slugError)}`)
        }
        if (slugRows) selectedAgentRows.push(...slugRows)
      }

      const seenAgentIds = new Set<string>()
      for (const agentRow of selectedAgentRows) {
        if (!agentRow.agent_type || seenAgentIds.has(agentRow.id)) continue
        seenAgentIds.add(agentRow.id)
        const focusAreasStr = Array.isArray(agentRow.focus_areas)
          ? agentRow.focus_areas.join(", ")
          : (agentRow.focus_areas ?? null)
        selectedAgentsForAnalysis.push({
          agent_type: agentRow.agent_type,
          name: agentRow.name,
          system_prompt: agentRow.system_prompt ?? null,
          focus_areas: focusAreasStr,
        })
      }
    } else if (selectedAgentTypes.length > 0) {
      selectedAgentsForAnalysis.push(...selectedAgentTypes)
    }

    // Run AI repository analysis
    const analysis = await analyzeRepository({
      repoUrl: claimedAudit.repo_url,
      branch: claimedAudit.branch,
      contractCode: claimedAudit.contract_code || undefined,
      contractFilename: claimedAudit.contract_filename || undefined,
      archiveFilename: claimedAudit.archive_filename || undefined,
      selectedAgents: selectedAgentsForAnalysis,
    })

    let totalReward = 0
    const findingsToInsert: any[] = []
    const rewardMeta: any[] = []
    const DEFAULT_AGENT_WALLET = "0x95D10619338707703475239EC03120A8266AF995"
    const isValidEvmAddress = (addr?: string | null) => Boolean(addr && /^0x[0-9a-fA-F]{40}$/.test(addr))

    for (const finding of analysis.findings) {
      const reward = calculateReward(finding.severity, finding.confidence)
      totalReward += reward
      const agent = agentByType.get(finding.agent_type) ?? null
      let destinationAddress = agent?.wallet_address ?? null
      if (!isValidEvmAddress(destinationAddress)) {
        destinationAddress = DEFAULT_AGENT_WALLET
      }


      findingsToInsert.push({
        audit_id: claimedAudit.id,
        user_id: claimedAudit.user_id,
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

    const { data: insertedFindings, error: findingsError } = await admin
      .from("findings")
      .insert(findingsToInsert)
      .select()

    if (findingsError) throw findingsError

    let hadSettlementFailures = false

    // Execute agent payouts and update rewards table
    for (let idx = 0; idx < (insertedFindings?.length ?? 0); idx++) {
      const finding = insertedFindings[idx]
      const meta = rewardMeta[idx]
      const rewardAmount = Number(finding.reward_amount ?? 0)
      const agentId = meta.agentId
      const destinationAddress = meta.destinationAddress
      const fallbackProvider = isEscrowConfigured() ? "escrow_contract" : "circle_arc"
      let rewardStatus = "failed"
      let provider = fallbackProvider
      let txHash = null
      let externalId = null
      let settledAt = null

      if (destinationAddress && rewardAmount > 0) {
        const settlement = await settleReward({
          auditUuid,
          destinationAddress,
          amount: rewardAmount,
          idempotencyKey: `${auditUuid}:${finding.id}`,
        })

        rewardStatus = settlement.status
        provider = settlement.provider || fallbackProvider
        txHash = settlement.txHash
        externalId = settlement.externalId
        if (settlement.status === "settled") {
          settledAt = new Date().toISOString()
        } else {
          hadSettlementFailures = true
          console.error("[audit-processor] Reward settlement failed", {
            findingId: finding.id,
            destinationAddress,
            amount: rewardAmount,
            settlement,
          })
        }
      } else if (rewardAmount === 0) {
        // No reward due for this finding — mark as skipped but do not treat as a settlement failure.
        console.info("[audit-processor] Skipping zero-value reward for finding", {
          findingId: finding.id,
          agentId,
        })
        rewardStatus = "skipped"
      } else {
        console.warn("[audit-processor] Missing destination wallet for finding", {
          findingId: finding.id,
          agentId,
          destinationAddress,
          rewardAmount,
        })
        hadSettlementFailures = true
      }

      const { error: rewardError } = await admin.from("rewards").insert([
        {
          finding_id: finding.id,
          user_id: claimedAudit.user_id,
          agent_id: agentId,
          amount: rewardAmount,
          status: rewardStatus,
          provider,
          tx_hash: txHash,
          external_id: externalId,
          settled_at: settledAt,
        },
      ])

      if (rewardError) {
        console.error("[audit-processor] Failed to insert reward record", rewardError)
      }

      await admin.from("findings").update({ reward_status: rewardStatus }).eq("id", finding.id)

      if (rewardStatus === "settled" && agentId) {
        try {
          await updateAgentReputation({
            agentId,
            registryAddress: meta.registryAddress ?? null,
            delta: 0,
          })
          await admin.rpc("increment_agent_stats", {
            p_agent_id: agentId,
            p_earned: rewardAmount,
            p_reputation: 0,
          })
        } catch (repErr) {
          console.warn("[audit-processor] Agent reputation update error", repErr)
        }
      }
    }

    if (feeRow?.id) {
      const escrowState = await getOnChainEscrow(auditUuid)
      if (!escrowState) {
        console.warn("[audit-processor] Escrow state unavailable after reward settlement; continuing without on-chain reconciliation.", { auditUuid })
        await admin.from("audit_fees").update({ status: "settled" }).eq("id", feeRow.id)
      } else if (escrowState.remaining > BigInt(0)) {
        console.log("[audit-processor] Extra escrow remaining, refunding depositor", {
          auditUuid,
          remaining: escrowState.remaining.toString(),
          depositor: escrowState.depositor,
        })
        let refundResult = await refundContractFee({ auditUuid })
        if (refundResult.status !== "settled") {
          const errText = String(refundResult.error || "").toLowerCase()
          const shouldFallbackToCircle = isEscrowConfigured() && isCircleConfigured() && (
            errText.includes("insufficient funds") ||
            errText.includes("zero native balance") ||
            errText.includes("gas") ||
            errText.includes("request limit reached") ||
            errText.includes("too many requests") ||
            errText.includes("exceeded maximum retry limit") ||
            errText.includes("rate limit") ||
            errText.includes("599") ||
            errText.includes("429") ||
            errText.includes("rpc")
          )

          if (shouldFallbackToCircle && feeRow.source_address) {
            console.warn("[audit-processor] Escrow refund failed due to gas; falling back to Circle refund", {
              auditUuid,
              refundResult,
            })
            refundResult = await refundFee({
              destinationAddress: feeRow.source_address,
              amount: Number(feeRow.amount || 0),
              idempotencyKey: auditUuid,
            })
          } else {
            console.warn("[audit-processor] Escrow refund failed after reward settlement; continuing to audit cleanup", {
              auditUuid,
              refundResult,
            })
          }

          if (refundResult.status !== "settled") {
            if (!refundResult.error?.toLowerCase().includes("nothing to refund") && !refundResult.error?.toLowerCase().includes("already settled")) {
              throw new Error(`Escrow refund failed: ${refundResult.error ?? "unknown"}`)
            }
          }
        }

        await admin
          .from("audit_fees")
          .update({ status: "settled", refund_external_id: refundResult.externalId ?? null })
          .eq("id", feeRow.id)
      } else {
        const settleResult = await settleContractAudit({ auditUuid })
        if (settleResult.error) {
          const errText = String(settleResult.error || "").toLowerCase()
          const gasOrRpcIssue =
            errText.includes("zero native balance") ||
            errText.includes("insufficient funds") ||
            errText.includes("gas") ||
            errText.includes("request limit reached") ||
            errText.includes("too many requests") ||
            errText.includes("exceeded maximum retry limit") ||
            errText.includes("rate limit") ||
            errText.includes("599") ||
            errText.includes("429") ||
            errText.includes("rpc")
          if (gasOrRpcIssue && isEscrowConfigured() && isCircleConfigured()) {
            console.warn("[audit-processor] Escrow settle failed due to operator/RPC issue; marking fee settled and continuing", {
              auditUuid,
              settleResult,
            })
          } else {
            throw new Error(`Escrow settlement failed: ${settleResult.error}`)
          }
        }
        await admin.from("audit_fees").update({ status: "settled" }).eq("id", feeRow.id)
      }
    }

    if (hadSettlementFailures) {
      throw new Error("One or more reward settlements failed")
    }

    const { data: finalAudit, error: finalErr } = await admin
      .from("audits")
      .update({
        status: "completed",
        findings_count: insertedFindings?.length ?? 0,
        total_reward: totalReward,
        completed_at: new Date().toISOString(),
      })
      .eq("id", claimedAudit.id)
      .select()
      .single()

    if (finalErr) throw finalErr


    console.log("[audit-processor] Completed inline audit successfully", { auditId: claimedAudit.id })
    return { success: true, audit: finalAudit }
  } catch (err: any) {
    console.error("[audit-processor] Failed during inline audit processing", { auditId: audit.id, error: err })

    await admin.from("audits").update({ status: "failed" }).eq("id", audit.id)

    // Attempt refund if fee row was retrieved
    try {
      const { data: feeRow } = await admin
        .from("audit_fees")
        .select("id, amount, source_address")
        .eq("user_id", audit.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (feeRow) {
          const refundResult = await refundFee({
            destinationAddress: feeRow.source_address || "",
            amount: Number(feeRow.amount || 1),
            idempotencyKey: audit.id,
          })
          if (refundResult.status === "failed" && refundResult.error) {
            console.warn("[audit-processor] audit failure refund failed, but marking fee refunded to avoid stuck state", {
              auditId: audit.id,
              feeId: feeRow.id,
              refundError: refundResult.error,
            })
          }
        await admin.from("audit_fees").update({ status: "refunded" }).eq("id", feeRow.id)
      }
    } catch (refundErr) {
      console.error("[audit-processor] Error refunding fee after audit failure", refundErr)
    }

    return { success: false, error: err?.message || String(err) }
  }
}
