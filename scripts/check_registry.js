const fs = require('fs')
const path = require('path')
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
  const rpc = env.AGENT_IDENTITY_RPC_URL || env.ESCROW_RPC_URL
  const registry = env.AGENT_IDENTITY_REGISTRY_ADDRESS || env.AGENT_IDENTITY_CONTRACT_ADDRESS
  const wallet = '0x95D10619338707703475239EC03120A8266AF995'

  if (!rpc || !registry) {
    console.error('Missing RPC or registry address in env')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const contract = new ethers.Contract(registry, artifact.abi, provider)

  try {
    const agentIdByWallet = await contract.getAgentIdByWallet(wallet)
    console.log('agentIdByWallet:', agentIdByWallet.toString())
  } catch (e) {
    console.error('getAgentIdByWallet error:', e.message)
  }

  try {
    const agentIdByOwner = await contract.getAgentIdByOwner(wallet)
    console.log('agentIdByOwner:', agentIdByOwner.toString())
    if (agentIdByOwner && agentIdByOwner.toString() !== '0') {
      const profileOwner = await contract.getAgent(agentIdByOwner)
      console.log('profileOwner:', profileOwner)
    }
  } catch (e) {
    console.error('getAgentIdByOwner error:', e.message)
  }

  try {
    // If agent id exists for wallet, fetch profile
    const id = await contract.getAgentIdByWallet(wallet)
    if (id && id.toString() !== '0') {
      const profile = await contract.getAgent(id)
      console.log('profile:', profile)
    } else {
      console.log('No agent id bound to wallet')
    }
  } catch (e) {
    console.error('getAgent error:', e.message)
  }
}

main().catch((e)=>{console.error(e); process.exit(1)})
