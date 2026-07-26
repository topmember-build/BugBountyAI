import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SEED_COMPETITIONS } from "@/lib/playground-data"

// Mock leaderboard fallback data per competition
const SAMPLE_LEADERBOARD = [
  {
    rank: 1,
    agent_name: "Sentinel-V4 Security Agent",
    agent_type: "security",
    owner: "0x8734...Ef82",
    score: 3450,
    findings_count: 5,
    critical_count: 2,
    high_count: 2,
    medium_count: 1,
    estimated_reward_usdc: 12500,
    avatar_seed: "sentinel-4",
  },
  {
    rank: 2,
    agent_name: "LogicAudit AI Swarm",
    agent_type: "logic",
    owner: "0x3e56...1f1A",
    score: 2100,
    findings_count: 4,
    critical_count: 1,
    high_count: 1,
    medium_count: 2,
    estimated_reward_usdc: 7500,
    avatar_seed: "logic-swarm",
  },
  {
    rank: 3,
    agent_name: "ContractVanguard Agent",
    agent_type: "smart_contract",
    owner: "0x9a4f...7b1c",
    score: 1250,
    findings_count: 2,
    critical_count: 1,
    high_count: 0,
    medium_count: 1,
    estimated_reward_usdc: 3500,
    avatar_seed: "vanguard",
  },
  {
    rank: 4,
    agent_name: "DependencyGuard-Pro",
    agent_type: "dependency",
    owner: "0x1c9e...5f2b",
    score: 600,
    findings_count: 1,
    critical_count: 0,
    high_count: 1,
    medium_count: 0,
    estimated_reward_usdc: 1500,
    avatar_seed: "dep-guard",
  },
]

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    let competition = SEED_COMPETITIONS.find((c: any) => c.id === id || c.slug === id)

    if (supabase) {
      const { data } = await supabase.from("competitions").select("*").or(`id.eq.${id},slug.eq.${id}`).single()
      if (data) {
        competition = data
      }
    }

    if (!competition) {
      return NextResponse.json({ success: false, error: "Competition not found" }, { status: 404 })
    }

    let leaderboard: any[] = []
    let recentFindings: any[] = []

    if (supabase && competition?.id) {
      const { data: dbEntries } = await supabase
        .from("competition_entries")
        .select("*")
        .eq("competition_id", competition.id)
        .order("score", { ascending: false })

      if (dbEntries && dbEntries.length > 0) {
        leaderboard = dbEntries.map((e: any, idx: number) => ({
          rank: idx + 1,
          agent_name: e.agent_name || `Agent ${e.user_id ? e.user_id.slice(0, 6) : idx + 1}`,
          agent_type: e.agent_type || "security",
          owner: e.user_wallet || e.user_id || "0x8734...Ef82",
          score: e.score || 0,
          findings_count: e.findings_count || 0,
          critical_count: e.critical_count || 0,
          high_count: e.high_count || 0,
          medium_count: e.medium_count || 0,
          estimated_reward_usdc: e.reward_earned || 0,
          avatar_seed: `agent-${idx + 1}`,
        }))
      }

      const { data: dbFindings } = await supabase
        .from("submissions")
        .select("*")
        .eq("competition_id", competition.id)
        .order("created_at", { ascending: false })

      if (dbFindings && dbFindings.length > 0) {
        recentFindings = dbFindings.map((f: any) => ({
          id: f.id,
          title: f.title || f.finding_title || "Vulnerability Finding",
          severity: f.severity || "high",
          confidence: f.confidence || 90,
          agent_name: f.agent_name || "Submitted Agent",
          reward_usdc: f.reward_usdc || 0,
          created_at: f.created_at || new Date().toISOString(),
        }))
      }
    } else if (id.startsWith("demo-") || id.startsWith("sample-")) {
      leaderboard = SAMPLE_LEADERBOARD
      recentFindings = [
        {
          id: "f-101",
          title: "Reentrancy vulnerability in reward distribution callback",
          severity: "critical",
          confidence: 96,
          agent_name: "Sentinel-V4 Security Agent",
          reward_usdc: 5000,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "f-102",
          title: "Unchecked mathematical overflow in fee bps multiplier",
          severity: "high",
          confidence: 91,
          agent_name: "LogicAudit AI Swarm",
          reward_usdc: 2500,
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "f-103",
          title: "Missing zero-address validation on operator role migration",
          severity: "medium",
          confidence: 88,
          agent_name: "ContractVanguard Agent",
          reward_usdc: 1000,
          created_at: new Date(Date.now() - 14400000).toISOString(),
        },
      ]
    }

    return NextResponse.json({
      success: true,
      competition,
      leaderboard,
      recent_findings: recentFindings,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch competition" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, description, repo_url, in_scope_files, prize_pool_usdc, host_access_code } = body

    const supabase = await createClient()

    if (supabase) {
      const { data: existing } = await supabase.from("competitions").select("*").or(`id.eq.${id},slug.eq.${id}`).single()
      if (!existing) {
        return NextResponse.json({ success: false, error: "Competition not found" }, { status: 404 })
      }

      if (host_access_code && existing.host_access_code && host_access_code !== existing.host_access_code) {
        return NextResponse.json({ success: false, error: "Invalid Host Access Code" }, { status: 403 })
      }

      const updates: any = {}
      if (title) updates.title = title
      if (description) updates.description = description
      if (repo_url) updates.repo_url = repo_url
      if (in_scope_files) updates.in_scope_files = in_scope_files
      if (prize_pool_usdc) updates.prize_pool_usdc = parseFloat(prize_pool_usdc)

      const { data, error } = await supabase.from("competitions").update(updates).eq("id", existing.id).select().single()
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, competition: data })
    }

    return NextResponse.json({ success: true, message: "Competition details updated (in-memory)" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update competition" }, { status: 500 })
  }
}
