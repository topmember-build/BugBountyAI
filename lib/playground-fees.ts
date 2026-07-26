/**
 * Playground Competition Entry Fee & Daily Quota Engine
 */

export interface FeeCalculationParams {
  userWallet?: string
  agentType?: "standard" | "custom" | "pro_parallel"
  selectedAgentIds?: string[]
}

export interface FeeCalculationResult {
  fee_usdc: number
  is_free_tier: boolean
  daily_quota_available: boolean
  breakdown: {
    base_fee_usdc: number
    custom_agent_fee_usdc: number
    discount_usdc: number
    quota_reason: string
  }
}

/** Production Fee Schedules */
export const SPONSOR_HOSTING_FEES = {
  flash_sprint: 250, // $250 USDC
  standard_competition: 750, // $750 USDC
  enterprise_audit: 2500, // $2,500 USDC
} as const

export const AGENT_REGISTRATION_FEES = {
  standard_agent: 25, // $25 USDC
  fine_tuned_agent: 100, // $100 USDC
} as const

export const SWARM_EXECUTION_FEES = {
  standard_swarm: 2.0, // $2.00 USDC
  custom_swarm: 5.0, // $5.00 USDC
  pro_parallel_swarm: 10.0, // $10.00 USDC
} as const

const QUOTA_STORAGE_KEY = "bugbounty_playground_quota_"

/**
 * Checks if the given wallet (or session) has an available 24-hour free run quota.
 */
export function checkDailyFreeQuota(userWallet?: string): boolean {
  if (typeof window === "undefined") return true
  const key = `${QUOTA_STORAGE_KEY}${userWallet || "guest"}`
  const lastUsedStr = localStorage.getItem(key)

  if (!lastUsedStr) return true

  const lastUsed = parseInt(lastUsedStr, 10)
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  return now - lastUsed >= twentyFourHours
}

/**
 * Records that a user has used their daily free quota run.
 */
export function recordDailyQuotaUsage(userWallet?: string): void {
  if (typeof window === "undefined") return
  const key = `${QUOTA_STORAGE_KEY}${userWallet || "guest"}`
  localStorage.setItem(key, Date.now().toString())
}

/**
 * Calculates competition entry fee based on quota, agent selection, and custom agent registration.
 */
export function calculateCompetitionEntryFee(params: FeeCalculationParams): FeeCalculationResult {
  const isCustom = params.agentType === "custom" || (params.selectedAgentIds && params.selectedAgentIds.some((id) => id.startsWith("custom-")))
  const isPro = params.agentType === "pro_parallel"
  const quotaAvailable = checkDailyFreeQuota(params.userWallet)

  let baseFee = isPro ? SWARM_EXECUTION_FEES.pro_parallel_swarm : SWARM_EXECUTION_FEES.standard_swarm
  let customFee = isCustom ? SWARM_EXECUTION_FEES.custom_swarm : 0.0
  let discount = 0.0
  let isFreeTier = false
  let quotaReason = isPro ? "Pro Parallel Swarm Entry ($10.00 USDC)" : "Standard Swarm Entry ($2.00 USDC)"

  if (!isCustom && !isPro && quotaAvailable) {
    isFreeTier = true
    discount = baseFee
    quotaReason = "Free Daily Tier (1/1 Available)"
  } else if (isCustom && quotaAvailable) {
    discount = baseFee
    quotaReason = "Free Daily Tier Applied (-$2.00 USDC) + Custom Agent Reg ($5.00 USDC)"
  } else if (isCustom) {
    quotaReason = "Custom Agent Registration & Launch ($5.00 USDC)"
  } else if (isPro) {
    quotaReason = "Pro Multi-Agent Parallel Swarm Launch ($10.00 USDC)"
  } else {
    quotaReason = "Daily Free Quota Exhausted &mdash; Standard Fee ($2.00 USDC)"
  }

  const finalFee = Math.max(0, baseFee + customFee - discount)

  return {
    fee_usdc: Math.round(finalFee * 100) / 100,
    is_free_tier: isFreeTier,
    daily_quota_available: quotaAvailable,
    breakdown: {
      base_fee_usdc: baseFee,
      custom_agent_fee_usdc: customFee,
      discount_usdc: discount,
      quota_reason: quotaReason,
    },
  }
}
