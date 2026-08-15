import { NextResponse } from "next/server"

const DEFAULT_METADATA: Record<string, any> = {
  sentinel: {
    name: "Sentinel",
    agent_type: "security",
    description: "Hunts injection, auth, and access-control vulnerabilities.",
    focus_areas: "Authentication, OWASP Top 10, SQL injection, XSS",
    avatar_seed: "sentinel",
    image: "https://www.bugbountyai.online/avatars/sentinel.png",
    external_url: "https://www.bugbountyai.online/agents/sentinel",
    attributes: [
      { trait_type: "Agent Type", value: "security" },
      { trait_type: "Specialty Focus", value: "Authentication, OWASP Top 10, SQL injection, XSS" },
      { trait_type: "Platform Status", value: "Verified Default Specialist" },
    ],
  },
  logician: {
    name: "Logician",
    agent_type: "logic",
    description: "Detects business-logic flaws and broken invariants.",
    focus_areas: "Business logic, invariants, race conditions, authorization",
    avatar_seed: "logician",
    image: "https://www.bugbountyai.online/avatars/logician.png",
    external_url: "https://www.bugbountyai.online/agents/logician",
    attributes: [
      { trait_type: "Agent Type", value: "logic" },
      { trait_type: "Specialty Focus", value: "Business logic, invariants, race conditions" },
      { trait_type: "Platform Status", value: "Verified Default Specialist" },
    ],
  },
  chainwarden: {
    name: "ChainWarden",
    agent_type: "smart_contract",
    description: "Audits smart contracts for reentrancy and economic exploits.",
    focus_areas: "Reentrancy, access control, overflow, economic attacks",
    avatar_seed: "chainwarden",
    image: "https://www.bugbountyai.online/avatars/chainwarden.png",
    external_url: "https://www.bugbountyai.online/agents/chainwarden",
    attributes: [
      { trait_type: "Agent Type", value: "smart_contract" },
      { trait_type: "Specialty Focus", value: "Reentrancy, access control, economic attacks" },
      { trait_type: "Platform Status", value: "Verified Default Specialist" },
    ],
  },
  dependa: {
    name: "Dependa",
    agent_type: "dependency",
    description: "Scans dependency trees for known CVEs and supply-chain risk.",
    focus_areas: "Dependencies, CVEs, supply-chain, package hygiene",
    avatar_seed: "dependa",
    image: "https://www.bugbountyai.online/avatars/dependa.png",
    external_url: "https://www.bugbountyai.online/agents/dependa",
    attributes: [
      { trait_type: "Agent Type", value: "dependency" },
      { trait_type: "Specialty Focus", value: "Dependencies, CVEs, supply-chain hygiene" },
      { trait_type: "Platform Status", value: "Verified Default Specialist" },
    ],
  },
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const slug = id.toLowerCase()

    const metadata = DEFAULT_METADATA[slug] || {
      name: `Agent ${id}`,
      description: "Autonomous Security Audit Agent on BugBounty AI Platform.",
      external_url: `https://www.bugbountyai.online/agents/${slug}`,
      attributes: [{ trait_type: "Platform Status", value: "Registered Agent" }],
    }

    return NextResponse.json(metadata)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch agent metadata" },
      { status: 500 }
    )
  }
}
