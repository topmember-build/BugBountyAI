import type { Severity } from "@/lib/types"

/**
 * Base USDC reward per severity tier. The final reward is scaled by the
 * agent's confidence score (0-1), so a high-confidence critical finding
 * pays the full base, while a low-confidence one pays proportionally less.
 */
export const SEVERITY_BASE_REWARD: Record<Severity, number> = {
  critical: 0.05,
  high: 0.03,
  medium: 0.012,
  low: 0.004,
  info: 0,
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
}

/**
 * Compute the USDC reward for a finding.
 * reward = base(severity) * confidence, rounded to 6 decimals (USDC precision).
 */
export function calculateReward(severity: Severity, confidence: number): number {
  const base = SEVERITY_BASE_REWARD[severity] ?? 0
  const clamped = Math.max(0, Math.min(1, confidence))
  const raw = base * clamped
  return Math.round(raw * 1_000_000) / 1_000_000
}

export function formatUsdc(amount: number): string {
  return `$${amount.toFixed(amount < 1 ? 4 : 2)}`
}
