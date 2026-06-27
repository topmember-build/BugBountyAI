import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("agent_contracts")
    .select("id,contract_address,name,metadata,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Optionally try to fetch simple on-chain name() if available
  const url = new URL(request.url)
  const tryOnchain = url.searchParams.get("onchain") === "1"
  const network = process.env.ETH_NETWORK || "homestead"

  if (!tryOnchain) return NextResponse.json({ contracts: data ?? [], network })

  try {
    // dynamic import to avoid bundler issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ethers } = await import("ethers")

    const alchemyKey = process.env.ALCHEMY_API_KEY || null
    const infuraId = process.env.INFURA_PROJECT_ID || null

    const provider = ethers.getDefaultProvider(network, {
      alchemy: alchemyKey ? alchemyKey : undefined,
      infura: infuraId ? infuraId : undefined,
    })

    const enriched = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const addr = row.contract_address
        let onchainName: string | null = null
        let onchainSymbol: string | null = null
        try {
          const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
          ]
          const c = new ethers.Contract(addr, abi, provider)
          onchainName = await c.name().catch(() => null)
          onchainSymbol = await c.symbol().catch(() => null)
        } catch (e) {
          onchainName = null
          onchainSymbol = null
        }
        return { ...row, onchainName, onchainSymbol }
      })
    )

    return NextResponse.json({ contracts: enriched, network })
  } catch (err) {
    return NextResponse.json({ contracts: data ?? [], warning: "onchain lookup failed", network })
  }
}
