#!/usr/bin/env node
// Simple worker to process queued audits.
// Run with: node scripts/audit_worker.js

const { createAdminClient } = require('../lib/supabase/admin')
const { analyzeRepository } = require('../lib/analyzer')
const { calculateReward } = require('../lib/rewards')
const { refundFee, settleReward, getTransactionStatus, getTreasuryAddress, transferFromDeveloperWallet } = require('../lib/circle')
const { randomUUID } = require('crypto')
const { notifyContractDeposit, settleContractAudit } = require('../lib/escrow-contract')
const { createCircleUser, createUserSession, getUserTransaction, getUserWallet } = require('../lib/circle-user')
const { updateAgentReputation } = require('../lib/agent-identity')

const POLL_INTERVAL_MS = 30000
const FEE_PENDING_DELAY_MS = 30000

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function processOne() {
  const admin = createAdminClient()
  const { data: queued } = await admin.from('audits').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle()
if (!queued) {
      await sleep(POLL_INTERVAL_MS)
      return false
    }

  const audit = queued
  console.log('[worker] Attempting to claim audit', audit.id)

  // attempt to atomically claim the queued audit — only succeed if status is still 'queued'
  const { data: claimed, error: claimErr } = await admin
    .from('audits')
    .update({ status: 'scanning', started_at: new Date().toISOString() })
    .eq('id', audit.id)
    .eq('status', 'queued')
    .select()
    .maybeSingle()

  if (claimErr) {
    console.error('[worker] Error claiming audit', audit.id, claimErr)
    return false
  }
  if (!claimed) {
    // somebody else claimed it first — skip
    console.log('[worker] Audit already claimed by another worker, skipping', audit.id)
    return true
  }

  // use the claimed row going forward
  const claimedAudit = claimed
  console.log('[worker] Processing claimed audit', claimedAudit.id)

  try {
    let feeQuery = admin
      .from('audit_fees')
      .select('*')
      .eq('user_id', claimedAudit.user_id)

    if (claimedAudit.audit_fee_id) {
      feeQuery = feeQuery.eq('id', claimedAudit.audit_fee_id)
    } else {
      feeQuery = feeQuery.order('created_at', { ascending: false }).limit(1)
    }

    const { data: feeRow } = await feeQuery.maybeSingle()

    if (!feeRow) {
      throw new Error('No audit fee row found for user')
    }

    const { data: agents } = await admin.from('agents').select('id, slug, agent_type, wallet_address, onchain_agent_id, onchain_registry_address')
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

    if (feeRow.status !== 'settled' && feeRow.status !== 'used') {
      console.warn('[worker] Fee row not yet settled, delaying audit', { auditId: claimedAudit.id, feeRowStatus: feeRow.status })
      await admin.from('audits').update({ status: 'queued' }).eq('id', claimedAudit.id)
      await sleep(FEE_PENDING_DELAY_MS)
      return false
    }

    if (feeRow.source_address) {
      const depositResult = await notifyContractDeposit({
        auditUuid: feeRow.id,
        depositor: feeRow.source_address,
        amount: Number(feeRow.amount ?? 1),
      })
      if (depositResult.error) {
        console.warn('[worker] notifyContractDeposit failed; continuing to attempt payment', depositResult)
      }
    }

    const selectedAgentIds = Array.isArray(claimedAudit.selected_agent_ids)
      ? claimedAudit.selected_agent_ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
      : []
    const selectedAgentTypes = Array.isArray(claimedAudit.selected_agent_types)
      ? claimedAudit.selected_agent_types.filter((type) => typeof type === 'string' && type.trim().length > 0)
      : []

    const selectedAgentsForAnalysis = []

    if (selectedAgentIds.length > 0) {
      const validSelectedAgentIds = Array.from(new Set(selectedAgentIds.map((id) => id.trim()).filter(Boolean)))
      const isUuid = (value) =>
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)

      const uuidAgentIds = validSelectedAgentIds.filter(isUuid)
      const slugAgentIds = validSelectedAgentIds
        .filter((id) => !isUuid(id))
        .flatMap((id) => (id.startsWith('default-') ? [id, id.replace(/^default-/, '')] : [id]))

      const selectedAgentRows = []
      if (uuidAgentIds.length > 0) {
        const { data: uuidRows, error: uuidError } = await admin
          .from('agents')
          .select('id, name, agent_type, system_prompt, focus_areas')
          .in('id', uuidAgentIds)

        if (uuidError) {
          throw new Error(`Failed to load selected agents by uuid: ${uuidError.message || String(uuidError)}`)
        }
        selectedAgentRows.push(...(uuidRows || []))
      }

      if (slugAgentIds.length > 0) {
        const { data: slugRows, error: slugError } = await admin
          .from('agents')
          .select('id, name, agent_type, system_prompt, focus_areas')
          .in('slug', Array.from(new Set(slugAgentIds)))

        if (slugError) {
          throw new Error(`Failed to load selected agents by slug: ${slugError.message || String(slugError)}`)
        }
        selectedAgentRows.push(...(slugRows || []))
      }

      if (selectedAgentRows.length === 0) {
        throw new Error('Unable to resolve selected agents for queued audit.')
      }

      const seenAgentIds = new Set()
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

    const analysis = await analyzeRepository({
      repoUrl: claimedAudit.repo_url,
      branch: claimedAudit.branch,
      contractCode: claimedAudit.contract_code || undefined,
      contractFilename: claimedAudit.contract_filename || undefined,
      archiveFilename: claimedAudit.archive_filename || undefined,
      selectedAgents: selectedAgentsForAnalysis,
    })

    let totalReward = 0
    const findingsToInsert = []
    const rewardMeta = []

    for (const finding of analysis.findings) {
      const reward = calculateReward(finding.severity, finding.confidence)
      totalReward += reward
      const agent = agentByType.get(finding.agent_type) ?? null
      const destinationAddress = agent?.wallet_address ?? null

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
        reward_status: 'pending',
      })

      rewardMeta.push({
        agentId: agent?.id ?? null,
        destinationAddress,
        rewardAmount: reward,
        registryAddress: agent?.onchain_registry_address ?? null,
        severity: finding.severity,
      })
    }

    const { data: insertedFindings, error: findingsError } = await admin.from('findings').insert(findingsToInsert).select()
    if (findingsError) throw findingsError

    for (let idx = 0; idx < (insertedFindings?.length ?? 0); idx++) {
      const finding = insertedFindings[idx]
      const meta = rewardMeta[idx]
      const rewardAmount = Number(finding.reward_amount ?? 0)
      const agentId = meta.agentId
      const destinationAddress = meta.destinationAddress
      let rewardStatus = 'failed'
      let provider = 'unknown'
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
        if (settlement.status === 'settled') {
          settledAt = new Date().toISOString()
        }
      } else {
        console.warn('[worker] Missing destination wallet or reward amount for finding', {
          findingId: finding.id,
          agentId,
          destinationAddress,
          rewardAmount,
        })
      }

      const { error: rewardError } = await admin.from('rewards').insert([
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
      if (rewardError) throw rewardError

      await admin.from('findings').update({ reward_status: rewardStatus }).eq('id', finding.id)

      if (rewardStatus === 'settled' && agentId) {
        await updateAgentReputation({
          agentId,
          registryAddress: meta.registryAddress ?? null,
          delta: 0,
        })
        await admin.rpc('increment_agent_stats', {
          p_agent_id: agentId,
          p_earned: rewardAmount,
          p_reputation: 0,
        })
      }
    }

    await admin
      .from('audits')
      .update({
        status: 'completed',
        findings_count: insertedFindings?.length ?? 0,
        total_reward: totalReward,
        completed_at: new Date().toISOString(),
      })
      .eq('id', claimedAudit.id)

    console.log('[worker] Completed audit', claimedAudit.id)
    return true
  } catch (err) {
    console.error('[worker] Failed to process audit', audit.id, err)
    try {
      const idToMark = (typeof claimedAudit !== 'undefined' && claimedAudit && claimedAudit.id) ? claimedAudit.id : audit.id
      await admin.from('audits').update({ status: 'failed' }).eq('id', idToMark)
    } catch (uErr) {
      console.error('[worker] failed to mark audit as failed', uErr)
    }
    try {
      const userIdForFee = (typeof claimedAudit !== 'undefined' && claimedAudit && claimedAudit.user_id) ? claimedAudit.user_id : audit.user_id
      const { data: feeRow } = await admin.from('audit_fees').select('id, amount, source_address').eq('user_id', userIdForFee).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (feeRow) {
        await refundFee({ destinationAddress: feeRow.source_address || null, amount: Number(feeRow.amount || 1), idempotencyKey: feeRow.id })
        await admin.from('audit_fees').update({ status: 'refunded' }).eq('id', feeRow.id)
      }
    } catch (refundErr) {
      console.error('[worker] Refund failed', refundErr)
    }
    return false
  }
}

async function run() {
  console.log('[worker] Starting audit worker loop')
  while (true) {
    try {
      const did = await processOne()
      if (!did) await sleep(5000)
    } catch (e) {
      console.error('[worker] unexpected error', e)
      await sleep(5000)
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
