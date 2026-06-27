import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const token = request.headers.get("x-refresh-token") || request.headers.get("authorization")
  const secret = process.env.REFRESH_SECRET
  if (!secret || !token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("agent_contracts").select("id,contract_address")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    // dynamic import
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
            "function tokenURI(uint256) view returns (string)",
          ]
          const c = new ethers.Contract(addr, abi, provider)
          const name = await c.name().catch(() => null)
          const symbol = await c.symbol().catch(() => null)
          let tokenURI: string | null = null
          for (const id of [1, 0]) {
            tokenURI = await c.tokenURI(id).catch(() => null)
            if (tokenURI) break
          }

          let metadata: any = { name, symbol }
          if (tokenURI) {
            try {
              if (tokenURI.startsWith("ipfs://")) {
                tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")
              }
              const resp = await fetch(tokenURI)
              if (resp.ok) {
                const json = await resp.json().catch(() => null)
                if (json) metadata.token = json
              }
            } catch (e) {
              // ignore token fetch errors
            }
          }

          await supabase.from("agent_contracts").update({ metadata }).eq("id", row.id)
        } catch (e) {
          // ignore per-contract
        }
      })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "onchain refresh failed" }, { status: 500 })
  }
}
