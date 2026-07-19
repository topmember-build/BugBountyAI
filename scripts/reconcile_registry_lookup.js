const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { ethers } = require('ethers')
const artifact = require('../public/contracts/AgentIdentityRegistry.json')

function readEnv() {
  const repoRoot = path.resolve(__dirname, '..')
  const envPath = path.join(repoRoot, '.env.development.local')
  const env = {}
  if (!fs.existsSync(envPath)) return env
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function main() {
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
  const rpc = env.AGENT_IDENTITY_RPC_URL || env.ESCROW_RPC_URL
  const privateKey = env.AGENT_IDENTITY_PRIVATE_KEY || env.ESCROW_OPERATOR_PRIVATE_KEY
  const registryAddress = env.AGENT_IDENTITY_REGISTRY_ADDRESS || env.AGENT_IDENTITY_CONTRACT_ADDRESS

  if (!url || !key) {
    console.error('Supabase URL or service role key missing in .env.development.local. Exiting.')
    process.exit(1)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: agents, error } = await supabase.from('agents').select('id,slug,name,wallet_address,onchain_agent_id,onchain_registry_address').is('onchain_agent_id', null).limit(1000)
  if (error) {
    console.error('Supabase query failed:', error.message)
    process.exit(1)
  }

  if (!rpc || !registryAddress) {
    console.log('RPC or registry address missing — will only attempt to update DB based on registry_address stored in rows (no on-chain lookups).')
  }

  const provider = rpc ? new ethers.JsonRpcProvider(rpc) : null
  const signer = provider && privateKey ? new ethers.Wallet(privateKey, provider) : null
  const contract = provider ? new ethers.Contract(registryAddress, artifact.abi, provider) : null
  const contractWithSigner = signer ? new ethers.Contract(registryAddress, artifact.abi, signer) : null

  console.log('Reconciling', agents.length, 'agents via registry lookup')

  for (const agent of agents) {
    try {
      const wallet = agent.wallet_address
      if (!wallet) {
        console.log('Skipping', agent.slug, '— no wallet_address')
        continue
      }
      if (!ethers.isAddress(wallet)) {
        console.log('Skipping', agent.slug, '— invalid wallet format', wallet)
        continue
      }

      // Prefer the registry address stored on the agent row, fallback to env-provided registry
      const regAddr = agent.onchain_registry_address || registryAddress
      if (!regAddr) {
        console.log('Skipping', agent.slug, '— no registry address available')
        continue
      }

      if (!provider) {
        console.log('Provider missing; cannot query on-chain for', agent.slug)
        continue
      }

      const regContract = new ethers.Contract(regAddr, artifact.abi, provider)

      // Look up agent id by owner and by wallet
      let agentIdByOwner = 0n
      let agentIdByWallet = 0n
      try {
        agentIdByOwner = await regContract.getAgentIdByOwner(wallet)
      } catch (e) {
        // ignore
      }
      try {
        agentIdByWallet = await regContract.getAgentIdByWallet(wallet)
      } catch (e) {
        // ignore
      }

      const idOwner = agentIdByOwner ? agentIdByOwner.toString() : null
      const idWallet = agentIdByWallet ? agentIdByWallet.toString() : null

      if (!idOwner && !idWallet) {
        console.log('No on-chain agent id found for', agent.slug)
        continue
      }

      // Prefer owner-based id if available
      const targetId = idOwner || idWallet

      // Update DB row
      const upd = {
        onchain_agent_id: targetId,
        onchain_registry_address: regAddr,
        onchain_identity_status: 'ready',
      }

      const { error: upErr } = await supabase.from('agents').update(upd).eq('id', agent.id)
      if (upErr) {
        console.error('Failed to update DB for', agent.slug, upErr.message)
      } else {
        console.log('Updated agent row for', agent.slug, '->', targetId)
      }

      // If wallet isn't bound on-chain and we have signer, bind it
      if (contractWithSigner) {
        try {
          const profile = await regContract.getAgent(BigInt(targetId))
          const boundWallet = profile?.wallet
          if (!boundWallet || boundWallet === '0x0000000000000000000000000000000000000000') {
            console.log('Binding wallet for', agent.slug, 'agentId', targetId)
            const bindTx = await contractWithSigner.bindWallet(BigInt(targetId), wallet)
            await bindTx.wait()
            console.log('Bound wallet for', agent.slug)
          }
        } catch (e) {
          console.error('Failed to bind wallet for', agent.slug, e.message)
        }
      }

      // small delay
      await new Promise((r) => setTimeout(r, 600))
    } catch (err) {
      console.error('Error processing', agent.slug, err instanceof Error ? err.message : String(err))
    }
  }

  console.log('Done')
}

main().catch((err) => { console.error(err); process.exit(1) })
