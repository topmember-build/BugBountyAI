import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase.from("agent_contracts").select("id,contract_address")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    // dynamic import to avoid bundler issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ethers } = await import("ethers")
    const alchemyKey = process.env.ALCHEMY_API_KEY || null
    const infuraId = process.env.INFURA_PROJECT_ID || null
    const network = process.env.ETH_NETWORK || "homestead"
    const provider = ethers.getDefaultProvider(network, {
      alchemy: alchemyKey ? alchemyKey : undefined,
      infura: infuraId ? infuraId : undefined,
    })

    await Promise.all(
      (data ?? []).map(async (row: any) => {
        const addr = row.contract_address
        try {
          const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
          ]
          const c = new ethers.Contract(addr, abi, provider)
          const name = await c.name().catch(() => null)
          const symbol = await c.symbol().catch(() => null)
          const metadata = { name, symbol }
          await supabase.from("agent_contracts").update({ metadata }).eq("id", row.id)
        } catch (e) {
          // ignore per-contract errors
        }
      })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "onchain refresh failed" }, { status: 500 })
  }
}
