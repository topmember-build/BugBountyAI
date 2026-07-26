import { NextResponse } from "next/server"
import { registerAgentIdentity } from "@/lib/agent-identity"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { agent_ids, repo_url, branch, user_wallet, agent_type = "standard", is_quota_used = false, agent_name = "Custom Auditor Agent" } = body

    const isCustom = agent_type === "custom" || (agent_ids && agent_ids.some((id: string) => id.startsWith("custom-")))
    
    let onchainIdentity = null
    if (isCustom) {
      const slug = agent_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bugbounty.ai"
      onchainIdentity = await registerAgentIdentity({
        ownerAddress: user_wallet || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
        name: agent_name,
        metadataUri: `${appUrl}/api/agents/${slug}/metadata`,
        walletAddress: user_wallet || null,
      })
    }

    // Fee calculations
    let feeUsdc = 0
    let feeTierReason = "Free Daily Tier (1/1 Available)"
    
    if (is_quota_used) {
      if (isCustom) {
        feeUsdc = 5.0
        feeTierReason = "Custom Agent Registration & Launch ($5.00 USDC)"
      } else {
        feeUsdc = 2.0
        feeTierReason = "Extra Swarm Launch ($2.00 USDC)"
      }
    } else {
      if (isCustom) {
        feeUsdc = 5.0
        feeTierReason = "Free Daily Tier (-$2.00 USDC) + Custom Agent Reg ($5.00 USDC)"
      } else {
        feeUsdc = 0.0
        feeTierReason = "Free Daily Tier (1/1 Available)"
      }
    }

    // Generate competition submission payload
    const submissionId = "sub-" + Date.now().toString(36)
    const mockEntry = {
      id: submissionId,
      competition_id: id,
      agent_ids: agent_ids || ["security", "logic"],
      agent_type: isCustom ? "custom" : "standard",
      user_wallet: user_wallet || "0x8734b4E4aa0a8968D86fddAB5Cc90c7fa7B5Ef82",
      onchain_identity: onchainIdentity,
      repo_url: repo_url || "https://github.com/topmember-build/BugBountyAI",
      branch: branch || "main",
      status: "queued",
      entry_fee_usdc: feeUsdc,
      fee_tier_reason: feeTierReason,
      escrow_tx_id: feeUsdc > 0 ? "0x" + Math.random().toString(16).substring(2, 42) : "FREE_TIER_NATIVE",
      message: "Agent swarm dispatched to Playground audit sprint. Analysis in progress.",
      estimated_completion: new Date(Date.now() + 120000).toISOString(),
    }

    return NextResponse.json({
      success: true,
      submission: mockEntry,
      fee_receipt: {
        fee_usdc: feeUsdc,
        is_free_tier: feeUsdc === 0,
        fee_tier_reason: feeTierReason,
        escrow_tx_id: mockEntry.escrow_tx_id,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to submit competition entry" }, { status: 500 })
  }
}
