// eslint-disable-next-line @typescript-eslint/no-require-imports
const ethersLib = require("ethers") as typeof import("ethers")
import AgentIdentityArtifact from "@/public/contracts/AgentIdentityRegistry.json"

type EthersWallet = InstanceType<(typeof ethersLib)["Wallet"]>

export interface AgentIdentityRegistrationResult {
  status: "ready" | "skipped" | "error"
  registryAddress: string | null
  onchainAgentId: string | null
  txHash: string | null
  error?: string
}

export interface AgentReputationUpdateResult {
  status: "ready" | "skipped" | "error"
  txHash: string | null
  error?: string
}

export interface AgentOnchainProfile {
  exists: boolean
  id: string | null
  owner: string | null
  name: string | null
  metadataURI: string | null
  wallet: string | null
  reputation: string | null
}

function getRpcUrl(): string | null {
  return process.env.AGENT_IDENTITY_RPC_URL || process.env.ESCROW_RPC_URL || null
}

function getPrivateKey(): string | null {
  return process.env.AGENT_IDENTITY_PRIVATE_KEY || process.env.ESCROW_OPERATOR_PRIVATE_KEY || null
}

function getRegistryAddress(): string | null {
  return process.env.AGENT_IDENTITY_REGISTRY_ADDRESS || process.env.AGENT_IDENTITY_CONTRACT_ADDRESS || null
}

async function deployRegistryContract(signer: EthersWallet): Promise<string> {
  const bytecode = typeof AgentIdentityArtifact.bytecode === "string" ? AgentIdentityArtifact.bytecode : (AgentIdentityArtifact.bytecode as any)?.object ?? ""
  const factory = new ethersLib.ContractFactory(AgentIdentityArtifact.abi as any, bytecode, signer)
  const contract = await factory.deploy()
  await contract.waitForDeployment()
  return await contract.getAddress()
}

export async function getAgentOnchainProfile(params: {
  agentId: string | null
  registryAddress: string | null
}): Promise<AgentOnchainProfile> {
  const rpcUrl = getRpcUrl()
  const registryAddress = params.registryAddress || getRegistryAddress()

  if (!params.agentId || !registryAddress || !rpcUrl) {
    return {
      exists: false,
      id: null,
      owner: null,
      name: null,
      metadataURI: null,
      wallet: null,
      reputation: null,
    }
  }

  try {
    const provider = new ethersLib.JsonRpcProvider(rpcUrl)
    const contract = new ethersLib.Contract(registryAddress, AgentIdentityArtifact.abi as any, provider)
    const profile = await contract.getAgent(BigInt(params.agentId))

    return {
      exists: Boolean(profile?.exists),
      id: profile?.id?.toString() ?? null,
      owner: profile?.owner ?? null,
      name: profile?.name ?? null,
      metadataURI: profile?.metadataURI ?? null,
      wallet: profile?.wallet ?? null,
      reputation: profile?.reputation?.toString() ?? null,
    }
  } catch {
    return {
      exists: false,
      id: null,
      owner: null,
      name: null,
      metadataURI: null,
      wallet: null,
      reputation: null,
    }
  }
}

export async function updateAgentReputation(params: {
  agentId: string | null
  registryAddress: string | null
  delta: number
}): Promise<AgentReputationUpdateResult> {
  const rpcUrl = getRpcUrl()
  const privateKey = getPrivateKey()
  const registryAddress = params.registryAddress || getRegistryAddress()

  if (!params.agentId || !registryAddress || !rpcUrl || !privateKey || params.delta <= 0) {
    return {
      status: "skipped",
      txHash: null,
    }
  }

  try {
    const provider = new ethersLib.JsonRpcProvider(rpcUrl)
    const signer = new ethersLib.Wallet(privateKey, provider)
    const contract = new ethersLib.Contract(registryAddress, AgentIdentityArtifact.abi as any, signer)

    const tx = await contract.addReputation(BigInt(params.agentId), BigInt(Math.round(params.delta)))
    await tx.wait()

    return {
      status: "ready",
      txHash: tx.hash,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      status: "error",
      txHash: null,
      error: message,
    }
  }
}

export async function registerAgentIdentity(params: {
  ownerAddress: string | null
  name: string
  metadataUri: string
  walletAddress: string | null
}): Promise<AgentIdentityRegistrationResult> {
  const rpcUrl = getRpcUrl()
  const privateKey = getPrivateKey()
  const ownerAddress = params.ownerAddress || params.walletAddress || null
  if (!ownerAddress || !ethersLib.isAddress(ownerAddress) || !rpcUrl || !privateKey) {
    return {
      status: "skipped",
      registryAddress: getRegistryAddress(),
      onchainAgentId: null,
      txHash: null,
    }
  }

  try {
    const provider = new ethersLib.JsonRpcProvider(rpcUrl)
    const signer = new ethersLib.Wallet(privateKey, provider)
    const registryAddress = getRegistryAddress() || (await deployRegistryContract(signer))
    const contract = new ethersLib.Contract(registryAddress, AgentIdentityArtifact.abi as any, signer)

    const tx = await contract.registerAgent(ownerAddress, params.name, params.metadataUri)
    const receipt = await tx.wait()

    const parsedLogs = (receipt?.logs ?? []).map((log: any) => {
      try {
        return contract.interface.parseLog(log)
      } catch {
        return null
      }
    })
    const registrationLog = parsedLogs.find((entry: any) => entry?.name === "AgentRegistered")
    const onchainAgentId = registrationLog?.args?.[0]?.toString() ?? null

    if (params.walletAddress && onchainAgentId) {
      const bindTx = await contract.bindWallet(onchainAgentId, params.walletAddress)
      await bindTx.wait()
    }

    return {
      status: "ready",
      registryAddress,
      onchainAgentId,
      txHash: tx.hash,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      status: "error",
      registryAddress: getRegistryAddress(),
      onchainAgentId: null,
      txHash: null,
      error: message,
    }
  }
}
