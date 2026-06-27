import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { AgentType } from "@/lib/types"

const AGENT_TYPES: AgentType[] = ["security", "logic", "dependency", "smart_contract"]
const AGENT_SELECT = "id, slug, name, agent_type, description, avatar_seed, wallet_address, focus_areas, system_prompt, findings_count, total_earned, reputation, created_at"

const DEFAULT_AGENTS = [
  {
    id: "default-sentinel",
    slug: "sentinel",
    name: "Sentinel",
    agent_type: "security" as const,
    description: "Hunts injection, auth, and access-control vulnerabilities.",
    focus_areas: "Authentication, OWASP Top 10, SQL injection, XSS",
    system_prompt: "You are Sentinel, a disciplined security agent for bug bounty work.",
    avatar_seed: "sentinel",
    wallet_address: "0x95D10619338707703475239EC03120A8266AF995",
    findings_count: 182,
    total_earned: 3.45406,
    reputation: 5235,
    created_at: new Date().toISOString(),
  },
  {
    id: "default-logician",
    slug: "logician",
    name: "Logician",
    agent_type: "logic" as const,
    description: "Detects business-logic flaws and broken invariants.",
    focus_areas: "Business logic, invariants, race conditions, authorization",
    system_prompt: "You are Logician, a logic-focused agent for bug bounty work.",
    avatar_seed: "logician",
    wallet_address: "0x95D10619338707703475239EC03120A8266AF995",
    findings_count: 72,
    total_earned: 1.05174,
    reputation: 2567,
    created_at: new Date().toISOString(),
  },
  {
    id: "default-chainwarden",
    slug: "chainwarden",
    name: "ChainWarden",
    agent_type: "smart_contract" as const,
    description: "Audits smart contracts for reentrancy and economic exploits.",
    focus_areas: "Reentrancy, access control, overflow, economic attacks",
    system_prompt: "You are ChainWarden, a smart contract-focused agent.",
    avatar_seed: "chainwarden",
    wallet_address: "0x95D10619338707703475239EC03120A8266AF995",
    findings_count: 36,
    total_earned: 0.8925,
    reputation: 2564,
    created_at: new Date().toISOString(),
  },
  {
    id: "default-dependa",
    slug: "dependa",
    name: "Dependa",
    agent_type: "dependency" as const,
    description: "Scans dependency trees for known CVEs and supply-chain risk.",
    focus_areas: "Dependencies, CVEs, supply-chain, package hygiene",
    system_prompt: "You are Dependa, a dependency-focused agent for bug bounty work.",
    avatar_seed: "dependa",
    wallet_address: "0x95D10619338707703475239EC03120A8266AF995",
    findings_count: 51,
    total_earned: 0.49136,
    reputation: 1872,
    created_at: new Date().toISOString(),
  },
]

// Public leaderboard of agents, ranked by total earnings.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const showMine = searchParams.get("mine") === "1"
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number(limitParam) : undefined

  let userId: string | null = null
  if (showMine) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({ agents: [] })
    }

    userId = user?.id ?? null
  }

  let query = supabase
    .from("agents")
    .select(AGENT_SELECT)
    .order("total_earned", { ascending: false })
    .order("reputation", { ascending: false })
    .order("created_at", { ascending: false })

  if (showMine) {
    if (!userId) {
      return NextResponse.json({ agents: [] })
    }
    query = query.eq("owner_id", userId)
  }

  if (limit && !Number.isNaN(limit) && limit > 0) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.warn("agents fallback due to query error", error.message)
    return NextResponse.json({ agents: DEFAULT_AGENTS })
  }

  const liveAgents = (data ?? []).filter((agent: any) => agent?.id && !String(agent.id).startsWith("default-"))

  const combinedAgents = [...liveAgents, ...DEFAULT_AGENTS].filter((agent, index, list) => {
    const slug = agent?.slug ?? agent?.id
    if (!slug) return false
    return index === list.findIndex((candidate) => (candidate?.slug ?? candidate?.id) === slug)
  })

  combinedAgents.sort((a, b) => Number(b.total_earned) - Number(a.total_earned) || Number(b.reputation) - Number(a.reputation))

  return NextResponse.json({ agents: combinedAgents })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const slug = typeof body?.slug === "string" ? body.slug.trim() : ""
  const agentType = typeof body?.agent_type === "string" && AGENT_TYPES.includes(body.agent_type)
    ? body.agent_type
    : "security"
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const focusAreas = typeof body?.focus_areas === "string" ? body.focus_areas.trim() : ""
  const systemPrompt = typeof body?.system_prompt === "string" ? body.system_prompt.trim() : ""
  let walletAddress = typeof body?.wallet_address === "string" ? body.wallet_address.trim() : null

  if (!walletAddress) {
    const { data: linkedWallets, error: linkedWalletError } = await supabase
      .from("user_wallets")
      .select("address")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!linkedWalletError && linkedWallets?.[0]?.address) {
      walletAddress = String(linkedWallets[0].address).trim()
    }
  }

  if (!name || !description || !systemPrompt) {
    return NextResponse.json({ error: "Name, description, and system prompt are required." }, { status: 400 })
  }

  if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address format." }, { status: 400 })
  }

  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  const insertPayload = {
    owner_id: user.id,
    slug: finalSlug,
    name,
    agent_type: agentType,
    description,
    focus_areas: focusAreas || null,
    system_prompt: systemPrompt || null,
    wallet_address: walletAddress || null,
    total_earned: 0,
    reputation: 0,
    findings_count: 0,
  }

  const { data, error } = await supabase
    .from("agents")
    .insert(insertPayload)
    .select(AGENT_SELECT)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agent: data })
}
