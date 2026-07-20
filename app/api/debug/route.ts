import { NextResponse } from "next/server"
import { isCircleConfigured } from "@/lib/circle"
import { isCircleUserConfigured } from "@/lib/circle-user"
import { isEscrowConfigured, getEscrowOperatorStatus } from "@/lib/escrow-contract"

export async function GET() {
  const operatorStatus = await getEscrowOperatorStatus()
  const missing = {
    SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY),
    CIRCLE_API_KEY: Boolean(process.env.CIRCLE_API_KEY),
    CIRCLE_WALLET_ID: Boolean(process.env.CIRCLE_WALLET_ID),
    CIRCLE_ENTITY_SECRET: Boolean(process.env.CIRCLE_ENTITY_SECRET),
    CIRCLE_APP_ID: Boolean(process.env.CIRCLE_APP_ID),
    ESCROW_CONTRACT_ADDRESS: Boolean(process.env.ESCROW_CONTRACT_ADDRESS),
    ESCROW_OPERATOR_PRIVATE_KEY: Boolean(process.env.ESCROW_OPERATOR_PRIVATE_KEY),
    ESCROW_RPC_URL: Boolean(process.env.ESCROW_RPC_URL),
  }

  return NextResponse.json({
    nodeVersion: process.version,
    runtime: process.env.VERCEL ? "vercel" : "local",
    isCircleConfigured: isCircleConfigured(),
    isCircleUserConfigured: isCircleUserConfigured(),
    isEscrowConfigured: isEscrowConfigured(),
    escrowOperator: operatorStatus,
    env: missing,
    timestamp: new Date().toISOString(),
  })
}
