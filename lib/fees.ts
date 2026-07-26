const ESCROW_FEE_RATE = 0.03
export const DEFAULT_HOSTING_FEE_USDC = Number(process.env.NEXT_PUBLIC_HOSTING_FEE_USDC ?? process.env.HOSTING_FEE_USDC ?? "50")

export function computeEscrowBreakdown(baseAmount: number | string | null | undefined) {
  const parsed = Number(baseAmount ?? 0)
  if (!Number.isFinite(parsed) || parsed < 0) return { base: 0, escrow: 0, net: 0 }

  const base = Number(parsed.toFixed(6))
  const escrow = Number((base * ESCROW_FEE_RATE).toFixed(6))
  const net = Number((base - escrow).toFixed(6))
  return { base, escrow, net }
}

export function computeHostPaymentBreakdown(
  prizePoolAmount: number | string | null | undefined,
  customHostingFee?: number | string | null
) {
  const pool = Math.max(0, Number(prizePoolAmount ?? 0))
  const hostingFee = customHostingFee !== undefined && customHostingFee !== null
    ? Math.max(0, Number(customHostingFee))
    : DEFAULT_HOSTING_FEE_USDC

  const escrowBreakdown = computeEscrowBreakdown(pool)

  const totalHostPayment = Number((pool + hostingFee).toFixed(2))

  return {
    prize_pool: Number(pool.toFixed(2)),
    hosting_fee: Number(hostingFee.toFixed(2)),
    protocol_escrow_fee: escrowBreakdown.escrow,
    net_auditor_pool: escrowBreakdown.net,
    total_host_payment: totalHostPayment,
  }
}

