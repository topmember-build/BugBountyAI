/**
 * Severity-Weighted & Rank-Tiered Prize Math & Reputation Delta Engine for BugBountyAI Playground Sprints.
 */

export interface SprintParticipantFinding {
  agent_id?: string
  agent_name: string
  owner_wallet: string
  agent_source?: "custom" | "platform_deployed"
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
}

export interface CalculatedAgentPayout {
  agent_id?: string
  agent_name: string
  owner_wallet: string
  agent_source: "custom" | "platform_deployed"
  score: number
  rank: number
  payout_usdc: number
  user_payout_usdc: number
  protocol_fee_usdc: number
  agent_creator_fee_usdc: number
  escrow_protocol_retained_fee_usdc: number
  relayer_dispatched_earnings_usdc: number
  relayer_wallet: string
  reputation_delta: number
  badge: "Sprint Champion" | "Top Auditor" | "Zero-Day Hunter" | "Verified Contributor"
}

export type DistributionMode = "severity_weighted" | "rank_tiered" | "winner_takes_all" | "custom_percentage"

export interface PayoutOptions {
  max_winners?: number
  distribution_mode?: DistributionMode
  custom_split_ratios?: number[]
}

export interface SprintPayoutSummary {
  total_prize_pool_usdc: number
  critical_pool_usdc: number
  high_pool_usdc: number
  medium_pool_usdc: number
  low_pool_usdc: number
  distribution_mode: DistributionMode
  max_winners: number
  relayer_wallet: string
  total_escrow_retained_fee_usdc: number
  total_relayer_dispatched_earnings_usdc: number
  payouts: CalculatedAgentPayout[]
}

/**
 * Default rank-tiered percentage splits based on max_winners
 */
export function getDefaultRankSplits(maxWinners: number): number[] {
  if (maxWinners <= 1) return [100]
  if (maxWinners === 2) return [70, 30]
  if (maxWinners === 3) return [60, 25, 15]
  if (maxWinners === 4) return [50, 25, 15, 10]
  if (maxWinners === 5) return [50, 25, 15, 6, 4]
  // 6 to 10
  return [40, 20, 12, 8, 6, 5, 3, 2, 2, 2].slice(0, maxWinners)
}

/**
 * Calculates USDC reward allocations and reputation deltas based on host distribution rules.
 */
export function calculateSprintPayouts(
  prizePoolUsdc: number,
  participants: SprintParticipantFinding[],
  options?: PayoutOptions
): SprintPayoutSummary {
  const maxWinners = Math.max(1, options?.max_winners || 5)
  const distMode: DistributionMode = options?.distribution_mode || "severity_weighted"

  const criticalPool = prizePoolUsdc * 0.50
  const highPool = prizePoolUsdc * 0.30
  const mediumPool = prizePoolUsdc * 0.15
  const lowPool = prizePoolUsdc * 0.05

  // 1. Calculate raw scores
  const scored = participants.map((p) => {
    const score = p.critical_count * 1000 + p.high_count * 500 + p.medium_count * 200 + p.low_count * 50
    return { ...p, score }
  })

  // 2. Sort descending by score
  scored.sort((a, b) => b.score - a.score)

  // 3. Compute gross payouts per rank depending on distribution mode
  let grossPayouts: number[] = new Array(scored.length).fill(0)

  if (distMode === "winner_takes_all" || maxWinners === 1) {
    if (scored.length > 0) grossPayouts[0] = prizePoolUsdc
  } else if (distMode === "rank_tiered" || distMode === "custom_percentage") {
    let ratios = options?.custom_split_ratios && options.custom_split_ratios.length > 0
      ? options.custom_split_ratios
      : getDefaultRankSplits(maxWinners)

    const totalRatio = ratios.reduce((sum, r) => sum + r, 0) || 100
    const winnersCount = Math.min(scored.length, maxWinners, ratios.length)

    for (let i = 0; i < winnersCount; i++) {
      grossPayouts[i] = (ratios[i] / totalRatio) * prizePoolUsdc
    }
  } else {
    // Default: severity_weighted
    const totalCriticals = participants.reduce((sum, p) => sum + p.critical_count, 0)
    const totalHighs = participants.reduce((sum, p) => sum + p.high_count, 0)
    const totalMediums = participants.reduce((sum, p) => sum + p.medium_count, 0)
    const totalLows = participants.reduce((sum, p) => sum + p.low_count, 0)

    const rawSeverities = scored.map((p) => {
      let payout = 0
      if (totalCriticals > 0 && p.critical_count > 0) {
        payout += (p.critical_count / totalCriticals) * criticalPool
      }
      if (totalHighs > 0 && p.high_count > 0) {
        payout += (p.high_count / totalHighs) * highPool
      }
      if (totalMediums > 0 && p.medium_count > 0) {
        payout += (p.medium_count / totalMediums) * mediumPool
      }
      if (totalLows > 0 && p.low_count > 0) {
        payout += (p.low_count / totalLows) * lowPool
      }
      return payout
    })

    // Cap payouts to maxWinners
    for (let i = 0; i < Math.min(scored.length, maxWinners); i++) {
      grossPayouts[i] = rawSeverities[i]
    }
  }

  const relayerWallet = process.env.ESCROW_RELAYER_ADDRESS || process.env.ESCROW_OPERATOR_ADDRESS || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82"

  // 4. Build output payouts with fair revenue split:
  // Custom Agent: 87% Winner / 10% Creator / 3% Protocol Fee
  // Pre-deployed Platform Agent: 30% Participant / 67% Agent Creator / 3% Protocol Fee
  const payouts: CalculatedAgentPayout[] = scored.map((item, index) => {
    const rank = index + 1
    const gross = grossPayouts[index] || 0
    const roundedGross = Math.round(gross * 100) / 100
    const isPlatformDeployed = item.agent_source === "platform_deployed"

    let userPayout = 0
    let creatorFee = 0
    let protocolFee = 0

    if (isPlatformDeployed) {
      // 30% Participant Runner / 67% Agent Creator / 3% Protocol Fee
      userPayout = Math.round(roundedGross * 0.30 * 100) / 100
      creatorFee = Math.round(roundedGross * 0.67 * 100) / 100
      protocolFee = Math.round((roundedGross - userPayout - creatorFee) * 100) / 100
    } else {
      // 87% Participant Winner / 10% Agent Creator / 3% Protocol Fee
      protocolFee = Math.round(roundedGross * 0.03 * 100) / 100
      creatorFee = Math.round(roundedGross * 0.10 * 100) / 100
      userPayout = Math.round((roundedGross - protocolFee - creatorFee) * 100) / 100
    }

    const relayerDispatched = Math.round((userPayout + creatorFee) * 100) / 100

    let badge: CalculatedAgentPayout["badge"] = "Verified Contributor"
    let reputation_delta = 5

    if (rank === 1) {
      badge = "Sprint Champion"
      reputation_delta = 50
    } else if (rank === 2) {
      badge = "Top Auditor"
      reputation_delta = 30
    } else if (rank === 3) {
      badge = "Zero-Day Hunter"
      reputation_delta = 15
    }

    return {
      agent_id: item.agent_id,
      agent_name: item.agent_name,
      owner_wallet: item.owner_wallet,
      agent_source: isPlatformDeployed ? "platform_deployed" : "custom",
      score: item.score,
      rank,
      payout_usdc: roundedGross,
      user_payout_usdc: userPayout,
      protocol_fee_usdc: protocolFee,
      agent_creator_fee_usdc: creatorFee,
      escrow_protocol_retained_fee_usdc: protocolFee,
      relayer_dispatched_earnings_usdc: relayerDispatched,
      relayer_wallet: relayerWallet,
      reputation_delta,
      badge,
    }
  })

  const totalEscrowRetained = payouts.reduce((acc, p) => acc + p.escrow_protocol_retained_fee_usdc, 0)
  const totalRelayerDispatched = payouts.reduce((acc, p) => acc + p.relayer_dispatched_earnings_usdc, 0)

  return {
    total_prize_pool_usdc: prizePoolUsdc,
    critical_pool_usdc: criticalPool,
    high_pool_usdc: highPool,
    medium_pool_usdc: mediumPool,
    low_pool_usdc: lowPool,
    distribution_mode: distMode,
    max_winners: maxWinners,
    relayer_wallet: relayerWallet,
    total_escrow_retained_fee_usdc: totalEscrowRetained,
    total_relayer_dispatched_earnings_usdc: totalRelayerDispatched,
    payouts,
  }
}
