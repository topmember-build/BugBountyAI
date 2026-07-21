#!/usr/bin/env node
const path = require("node:path")
const { loadEnvFile } = require("./load-env")
const { ethers } = require("ethers")

const repoRoot = process.cwd()
loadEnvFile(path.join(repoRoot, ".env.development.local"))
loadEnvFile(path.join(repoRoot, ".env"))

async function main() {
  const rpcUrl = process.env.ESCROW_RPC_URL
  const privateKey = process.env.ESCROW_OPERATOR_PRIVATE_KEY
  const envAddress = process.env.ESCROW_OPERATOR_ADDRESS
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS

  console.log("=== Escrow operator verification ===")
  console.log("ESCROW_RPC_URL:", rpcUrl ? rpcUrl : "<missing>")
  console.log("ESCROW_OPERATOR_PRIVATE_KEY:", privateKey ? "<loaded>" : "<missing>")
  console.log("ESCROW_OPERATOR_ADDRESS (env):", envAddress ? envAddress : "<missing>")
  console.log("ESCROW_CONTRACT_ADDRESS:", contractAddress ? contractAddress : "<missing>")

  if (!rpcUrl) {
    console.error("ERROR: ESCROW_RPC_URL is not set.")
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const network = await provider.getNetwork().catch((err) => {
    console.error("ERROR: failed to connect to RPC URL:", err.message || err)
    process.exit(1)
  })

  console.log(`Network: ${network.name} (chainId=${network.chainId})`)

  let operatorAddress = envAddress || null
  if (privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey)
      operatorAddress = wallet.address
      console.log("ESCROW_OPERATOR_ADDRESS (derived):", operatorAddress)
      if (envAddress && envAddress.toLowerCase() !== operatorAddress.toLowerCase()) {
        console.warn("WARNING: derived address does not match ESCROW_OPERATOR_ADDRESS env value.")
      }
    } catch (err) {
      console.error("ERROR: failed to derive address from ESCROW_OPERATOR_PRIVATE_KEY:", err.message || err)
    }
  }

  if (!operatorAddress) {
    console.error("ERROR: no escrow operator address available.")
    process.exit(1)
  }

  const balance = await provider.getBalance(operatorAddress).catch((err) => {
    console.error("ERROR: failed to read operator balance:", err.message || err)
    process.exit(1)
  })
  console.log("Operator balance:", ethers.formatEther(balance), "native")
  if (balance === 0n) {
    console.warn("WARNING: operator account has zero native balance and cannot pay gas.")
  }

  if (contractAddress) {
    const code = await provider.getCode(contractAddress).catch((err) => {
      console.error("ERROR: failed to read contract code:", err.message || err)
      process.exit(1)
    })
    console.log("Contract code present:", code && code !== "0x" ? "yes" : "no")
    if (!code || code === "0x") {
      console.warn("WARNING: no contract deployed at ESCROW_CONTRACT_ADDRESS on this RPC network.")
    }
  }

  console.log("=== verification complete ===")
}

main().catch((err) => {
  console.error("Unhandled error:", err)
  process.exit(1)
})
