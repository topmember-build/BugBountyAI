import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentOnchainProfile } from "@/lib/agent-identity"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)

  let agent: any = null
  let error: any = null

  ;({ data: agent, error } = await admin
    .from("agents")
    .select("id, slug, name, onchain_agent_id, onchain_registry_address, onchain_identity_status")
    .eq("slug", id)
    .maybeSingle())

  if (!agent && !error && isUuid) {
    ;({ data: agent, error } = await admin
      .from("agents")
      .select("id, slug, name, onchain_agent_id, onchain_registry_address, onchain_identity_status")
      .eq("id", id)
      .maybeSingle())
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const onchain = await getAgentOnchainProfile({
    agentId: agent.onchain_agent_id ?? null,
    registryAddress: agent.onchain_registry_address ?? null,
  })

  return NextResponse.json({ agent, onchain })
}
