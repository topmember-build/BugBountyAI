const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { ethers } = require('ethers')

async function readEnv() {
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
  const env = await readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
  const rpcUrl = env.AGENT_IDENTITY_RPC_URL || env.ESCROW_RPC_URL
  const privateKey = env.AGENT_IDENTITY_PRIVATE_KEY || env.ESCROW_OPERATOR_PRIVATE_KEY
  let registryAddress = env.AGENT_IDENTITY_REGISTRY_ADDRESS || env.AGENT_IDENTITY_CONTRACT_ADDRESS || null

  if (!url || !key) {
    console.error('Supabase URL or service role key missing in .env.development.local. Exiting.')
    process.exit(0)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // If no RPC or private key, do a safe no-op check to just report which agents are missing onchain ids
  if (!rpcUrl || !privateKey) {
    console.log('No RPC URL or private key provided. Listing agents that are missing on-chain id (no changes will be made).')
    const { data, error } = await supabase.from('agents').select('id,slug,name,wallet_address,onchain_agent_id,onchain_registry_address').is('onchain_agent_id', null).limit(1000)
    if (error) {
      console.error('Supabase query failed:', error.message)
      process.exit(1)
    }
    console.log(`Found ${data.length} agents missing onchain_agent_id`)
    for (const a of data) {
      console.log('-', a.slug, a.name, a.wallet_address || '(no wallet)')
    }
    process.exit(0)
  }

  // Load artifact
  const artifactPath = path.join(process.cwd(), 'public', 'contracts', 'AgentIdentityRegistry.json')
  if (!fs.existsSync(artifactPath)) {
    console.error('AgentIdentityRegistry artifact not found at', artifactPath)
    process.exit(1)
  }
  const artifact = require(artifactPath)

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)

  // Ensure registry address exists; if not, we'll attempt to deploy (mirror behavior in lib)
  let contract
  try {
    if (!registryAddress) {
      console.log('No registry address configured. Deploying new AgentIdentityRegistry contract...')
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer)
      const deployed = await factory.deploy()
      await deployed.waitForDeployment()
      registryAddress = await deployed.getAddress()
      console.log('Deployed registry at', registryAddress)
    }

    contract = new ethers.Contract(registryAddress, artifact.abi, signer)
  } catch (err) {
    console.error('Failed to prepare registry contract:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // Query agents missing onchain_agent_id
  const { data: agents, error } = await supabase.from('agents').select('id,slug,name,wallet_address,onchain_agent_id,onchain_registry_address').is('onchain_agent_id', null).limit(1000)
  if (error) {
    console.error('Supabase query failed:', error.message)
    process.exit(1)
  }

  console.log('Reconciling', agents.length, 'agents')

  for (const agent of agents) {
    try {
      const ownerAddress = agent.wallet_address || null
      if (!ownerAddress || !ethers.isAddress(ownerAddress)) {
        console.log('Skipping', agent.slug, '— no valid owner wallet to register')
        continue
      }

      console.log('Registering agent', agent.slug, 'owner', ownerAddress)
      const tx = await contract.registerAgent(ownerAddress, agent.name || agent.slug, '')
      const receipt = await tx.wait()

      let onchainAgentId = null
      const parsed = (receipt?.logs ?? []).map((l) => {
        try {
          return contract.interface.parseLog(l)
        } catch {
          return null
        }
      })
      const regLog = parsed.find((p) => p && p.name === 'AgentRegistered')
      onchainAgentId = regLog?.args?.[0]?.toString() ?? null

      if (onchainAgentId && agent.wallet_address) {
        console.log('Binding wallet', agent.wallet_address, 'to agent id', onchainAgentId)
        const btx = await contract.bindWallet(BigInt(onchainAgentId), agent.wallet_address)
        await btx.wait()
      }

      // Update DB row
      const upd = {
        onchain_agent_id: onchainAgentId,
        onchain_registry_address: registryAddress,
        onchain_identity_status: onchainAgentId ? 'ready' : 'registered',
      }
      const { error: upErr } = await supabase.from('agents').update(upd).eq('id', agent.id)
      if (upErr) {
        console.error('Failed to update DB for', agent.slug, upErr.message)
      } else {
        console.log('Updated agent row for', agent.slug, '->', onchainAgentId)
      }

      // small delay to avoid spamming RPC
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      console.error('Error processing', agent.slug, err instanceof Error ? err.message : String(err))
    }
  }

  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
