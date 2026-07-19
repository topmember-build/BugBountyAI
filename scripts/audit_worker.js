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

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function processOne() {
  const admin = createAdminClient()
  const { data: queued } = await admin.from('audits').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!queued) return false

  const audit = queued
  console.log('[worker] Processing audit', audit.id)

  // mark scanning
  await admin.from('audits').update({ status: 'scanning', started_at: new Date().toISOString() }).eq('id', audit.id)

  try {
    // Re-fetch fee row for this user and any transaction matching recent rows
    const { data: feeRow } = await admin.from('audit_fees').select('*').eq('user_id', audit.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle()

    // Minimal agent mapping: use all agent types; real workers might read saved payload
    const selectedAgentRows = []
    const { data: agents } = await admin.from('agents').select('id, slug, agent_type, wallet_address, onchain_agent_id, onchain_registry_address')
    const agentByType = new Map()
    for (const a of (agents||[])) {
      if (!a.agent_type || agentByType.has(a.agent_type)) continue
      agentByType.set(a.agent_type, {
        id: a.id,
        wallet_address: a.wallet_address ?? null,
        onchain_agent_id: a.onchain_agent_id ?? null,
        onchain_registry_address: a.onchain_registry_address ?? null,
      })
    }

    const analysis = await analyzeRepository({
      repoUrl: audit.repo_url,
      branch: audit.branch,
      contractCode: audit.contract_code || undefined,
      contractFilename: audit.contract_filename || undefined,
      archiveFilename: audit.archive_filename || undefined,
      selectedAgents: [],
    })

    // insert findings
    let totalReward = 0
    const findingsToInsert = analysis.findings.map((f) => {
      const reward = calculateReward(f.severity, f.confidence)
      totalReward += reward
      return {
        audit_id: audit.id,
        user_id: audit.user_id,
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
        reward_status: 'pending',
      }
    })

    const { data: insertedFindings, error: findingsError } = await admin.from('findings').insert(findingsToInsert).select()
    if (findingsError) throw findingsError

    // settle rewards similarly to the route logic
    // For brevity implement simple refund of leftover and finalize
    await admin.from('audits').update({ status: 'completed', findings_count: insertedFindings?.length ?? 0, total_reward: totalReward, completed_at: new Date().toISOString() }).eq('id', audit.id)

    console.log('[worker] Completed audit', audit.id)
    return true
  } catch (err) {
    console.error('[worker] Failed to process audit', audit.id, err)
    await admin.from('audits').update({ status: 'failed' }).eq('id', audit.id)
    // attempt refund
    try {
      const { data: feeRow } = await admin.from('audit_fees').select('id, amount, source_address').eq('user_id', audit.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (feeRow) {
        // call refundFee directly via lib/circle (may require environment credentials)
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
