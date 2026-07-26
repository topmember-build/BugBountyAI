const fs = require('fs')
const path = require('path')
const { ethers } = require('ethers')

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
  const artifact = require('../public/contracts/AgentIdentityRegistry.json')

  const provider = new ethers.JsonRpcProvider(rpc)
  const contract = new ethers.Contract(registry, artifact.abi, provider)

  let nextId
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      nextId = await contract.nextAgentId()
      break
    } catch (err) {
      if (attempt === 3) throw err
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log('TOTAL_REGISTERED_AGENTS_COUNT:', nextId.toString())

  for (let i = 1; i <= Number(nextId); i++) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const p = await contract.getAgent(i)
        console.log(`Agent #${p.id}:`, {
          name: p.name,
          owner: p.owner,
          wallet: p.wallet,
          reputation: p.reputation.toString(),
          metadataURI: p.metadataURI,
        })
        break
      } catch (err) {
        if (attempt === 3) console.warn(`Could not read Agent #${i}:`, err.message)
        await new Promise((r) => setTimeout(r, 1500))
      }
    }
  }
}

main().catch(console.error)
