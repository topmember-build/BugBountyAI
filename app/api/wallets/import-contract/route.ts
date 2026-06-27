import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const contract_address = body?.contract_address
  const name = body?.name ?? null
  if (!contract_address) return NextResponse.json({ error: "contract_address required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Insert into agent_contracts and also upsert into user_wallets for discoverability
  const { data: insertData, error: cErr } = await supabase.from("agent_contracts").insert({ user_id: user.id, contract_address, name }).select("id").single()
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  const { error: wErr } = await supabase.from("user_wallets").upsert({ user_id: user.id, address: contract_address })
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

  // Try to fetch on-chain metadata (name/symbol/tokenURI) for the newly inserted contract
  try {
    const { ethers } = await import("ethers")
    const alchemyKey = process.env.ALCHEMY_API_KEY || null
    const infuraId = process.env.INFURA_PROJECT_ID || null
    const network = process.env.ETH_NETWORK || "homestead"
    const provider = ethers.getDefaultProvider(network, {
      alchemy: alchemyKey ? alchemyKey : undefined,
      infura: infuraId ? infuraId : undefined,
    })

    const abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function tokenURI(uint256) view returns (string)",
    ]
    const c = new ethers.Contract(contract_address, abi, provider)
    const onchainName = await c.name().catch(() => null)
    const onchainSymbol = await c.symbol().catch(() => null)

    let metadata: any = { name: onchainName ?? name, symbol: onchainSymbol }

    let tokenURI: string | null = null
    for (const id of [1, 0]) {
      tokenURI = await c.tokenURI(id).catch(() => null)
      if (tokenURI) break
    }

    if (tokenURI) {
      try {
        if (tokenURI.startsWith("ipfs://")) tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")
        const resp = await fetch(tokenURI)
        if (resp.ok) {
          const json = await resp.json().catch(() => null)
          if (json) metadata.token = json
        }
      } catch (e) {
        // ignore
      }
    }

    await supabase.from("agent_contracts").update({ metadata }).eq("id", insertData.id)
  } catch (e) {
    // ignore metadata fetch failures
  }

  return NextResponse.json({ ok: true })
}
