const ESCROW_FEE_RATE = 0.03

export function computeEscrowBreakdown(baseAmount: number | string | null | undefined) {
  const parsed = Number(baseAmount ?? 0)
  if (!Number.isFinite(parsed) || parsed < 0) return { base: 0, escrow: 0, net: 0 }

  const base = Number(parsed.toFixed(6))
  const escrow = Number((base * ESCROW_FEE_RATE).toFixed(6))
  const net = Number((base - escrow).toFixed(6))
  return { base, escrow, net }
}
