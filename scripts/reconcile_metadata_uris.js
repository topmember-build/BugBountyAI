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
  const privateKey = env.AGENT_IDENTITY_PRIVATE_KEY || env.ESCROW_OPERATOR_PRIVATE_KEY
  const registryAddress = env.AGENT_IDENTITY_REGISTRY_ADDRESS || env.AGENT_IDENTITY_CONTRACT_ADDRESS
  const artifact = require('../public/contracts/AgentIdentityRegistry.json')

  const provider = new ethers.JsonRpcProvider(rpc)
  const signer = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(registryAddress, artifact.abi, signer)

  const defaultMetadataMap = {
    'Sentinel': 'https://www.bugbountyai.online/api/agents/sentinel/metadata',
    'Logician': 'https://www.bugbountyai.online/api/agents/logician/metadata',
    'ChainWarden': 'https://www.bugbountyai.online/api/agents/chainwarden/metadata',
    'Dependa': 'https://www.bugbountyai.online/api/agents/dependa/metadata',
  }

  const nextId = await contract.nextAgentId()
  console.log(`Reconciling Metadata URIs for ${nextId.toString()} on-chain agents...`)

  for (let i = 1; i <= Number(nextId); i++) {
    let retries = 3
    while (retries > 0) {
      try {
        const profile = await contract.getAgent(i)
        const expectedUri = defaultMetadataMap[profile.name] || `https://www.bugbountyai.online/api/agents/${profile.name.toLowerCase()}/metadata`

        if (profile.metadataURI !== expectedUri) {
          console.log(`Updating Agent #${i} (${profile.name}): ${profile.metadataURI} -> ${expectedUri}`)
          const tx = await contract.setMetadataURI(i, expectedUri)
          await tx.wait()
          console.log(`✓ Agent #${i} Metadata URI updated on-chain! TxHash: ${tx.hash}`)
        } else {
          console.log(`✓ Agent #${i} (${profile.name}) Metadata URI is already correct: ${profile.metadataURI}`)
        }
        break
      } catch (err) {
        retries--
        console.warn(`Retry agent #${i} due to transient RPC error:`, err.message)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }

  console.log('Finished Metadata URI reconciliation successfully!')
}

main().catch(console.error)
