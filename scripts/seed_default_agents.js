const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { ethers } = require('ethers')

const repoRoot = path.resolve(__dirname, '..')
const envPath = path.join(repoRoot, '.env.development.local')
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
  if (match) env[match[1]] = match[2]
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const artifact = require(path.join(repoRoot, 'public/contracts/AgentIdentityRegistry.json'))

function buildAgentAddress(seed) {
  return ethers.computeAddress(ethers.id(`bugbounty-agent-wallet-${seed}`))
}

const defaultAgents = [
  {
    slug: 'sentinel',
    name: 'Sentinel',
    agent_type: 'security',
    description: 'Hunts injection, auth, and access-control vulnerabilities.',
    focus_areas: 'Authentication, OWASP Top 10, SQL injection, XSS',
    system_prompt: 'You are Sentinel, a disciplined security agent for bug bounty work.',
    avatar_seed: 'sentinel',
    wallet_address: buildAgentAddress('sentinel'),
    findings_count: 182,
    total_earned: 3.45406,
    reputation: 5235,
    ownerAddress: buildAgentAddress('sentinel'),
  },
  {
    slug: 'logician',
    name: 'Logician',
    agent_type: 'logic',
    description: 'Detects business-logic flaws and broken invariants.',
    focus_areas: 'Business logic, invariants, race conditions, authorization',
    system_prompt: 'You are Logician, a logic-focused agent for bug bounty work.',
    avatar_seed: 'logician',
    wallet_address: buildAgentAddress('logician'),
    findings_count: 72,
    total_earned: 1.05174,
    reputation: 2567,
    ownerAddress: buildAgentAddress('logician'),
  },
  {
    slug: 'chainwarden',
    name: 'ChainWarden',
    agent_type: 'smart_contract',
    description: 'Audits smart contracts for reentrancy and economic exploits.',
    focus_areas: 'Reentrancy, access control, overflow, economic attacks',
    system_prompt: 'You are ChainWarden, a smart contract-focused agent.',
    avatar_seed: 'chainwarden',
    wallet_address: buildAgentAddress('chainwarden'),
    findings_count: 36,
    total_earned: 0.8925,
    reputation: 2564,
    ownerAddress: buildAgentAddress('chainwarden'),
  },
  {
    slug: 'dependa',
    name: 'Dependa',
    agent_type: 'dependency',
    description: 'Scans dependency trees for known CVEs and supply-chain risk.',
    focus_areas: 'Dependencies, CVEs, supply-chain, package hygiene',
    system_prompt: 'You are Dependa, a dependency-focused agent for bug bounty work.',
    avatar_seed: 'dependa',
    wallet_address: buildAgentAddress('dependa'),
    findings_count: 51,
    total_earned: 0.49136,
    reputation: 1872,
    ownerAddress: buildAgentAddress('dependa'),
  },
]

async function registerIdentity(agent) {
  const rpcUrl = env.AGENT_IDENTITY_RPC_URL || env.ESCROW_RPC_URL
  const privateKey = env.AGENT_IDENTITY_PRIVATE_KEY || env.ESCROW_OPERATOR_PRIVATE_KEY
  const registryAddress = env.AGENT_IDENTITY_REGISTRY_ADDRESS

  if (!rpcUrl || !privateKey || !registryAddress) {
    return { status: 'skipped', onchainAgentId: null, registryAddress: registryAddress || null }
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(registryAddress, artifact.abi, signer)

  const ownerAddress = agent.ownerAddress || agent.wallet_address
  if (!ethers.isAddress(ownerAddress)) {
    return { status: 'skipped', onchainAgentId: null, registryAddress }
  }

  try {
    const existingId = await contract.getAgentIdByOwner(ownerAddress)
    if (existingId && Number(existingId) > 0) {
      return { status: 'ready', onchainAgentId: existingId.toString(), registryAddress }
    }

    const tx = await contract.registerAgent(ownerAddress, agent.name, `https://bugbounty.ai/agents/${agent.slug}`)
    await tx.wait()
    const createdId = await contract.getAgentIdByOwner(ownerAddress)
    return {
      status: 'ready',
      onchainAgentId: createdId && Number(createdId) > 0 ? createdId.toString() : null,
      registryAddress,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: 'error', onchainAgentId: null, registryAddress, error: message }
  }
}

async function main() {
  for (const agent of defaultAgents) {
    const identity = await registerIdentity(agent)
    const payload = {
      owner_id: 'system',
      slug: agent.slug,
      name: agent.name,
      agent_type: agent.agent_type,
      description: agent.description,
      focus_areas: agent.focus_areas,
      system_prompt: agent.system_prompt,
      avatar_seed: agent.avatar_seed,
      wallet_address: agent.wallet_address,
      findings_count: agent.findings_count,
      total_earned: agent.total_earned,
      reputation: agent.reputation,
      onchain_agent_id: identity.onchainAgentId ?? null,
      onchain_registry_address: identity.registryAddress ?? null,
      onchain_identity_status: identity.status,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('agents')
      .upsert(payload, { onConflict: 'slug' })
      .select('slug, name, onchain_agent_id, onchain_registry_address, onchain_identity_status')
      .single()

    if (error) {
      console.error('failed to upsert', agent.slug, error.message)
    } else {
      console.log('seeded', data)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
