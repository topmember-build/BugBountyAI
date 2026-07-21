#!/usr/bin/env node
const path = require("node:path")
const { loadEnvFile } = require("./load-env")
const { ethers } = require("ethers")

function parseArgs() {
  const args = process.argv.slice(2)
  const result = { remoteUrl: null }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--url" || arg === "-u") {
      result.remoteUrl = args[i + 1]
      i++
    }
  }
  return result
}

function getLocalEscrowConfig() {
  const rpcUrl = process.env.ESCROW_RPC_URL || null
  const privateKey = process.env.ESCROW_OPERATOR_PRIVATE_KEY || null
  const envAddress = process.env.ESCROW_OPERATOR_ADDRESS || null
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS || null
  let derivedAddress = null
  if (privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey)
      derivedAddress = wallet.address
    } catch (err) {
      derivedAddress = `invalid private key: ${err?.message ?? String(err)}`
    }
  }
  return {
    rpcUrl,
    privateKeyLoaded: Boolean(privateKey),
    envAddress,
    derivedAddress,
    contractAddress,
  }
}

function printLocalConfig(config) {
  console.log("=== Local escrow config ===")
  console.log("ESCROW_RPC_URL:", config.rpcUrl ?? "<missing>")
  console.log("ESCROW_OPERATOR_PRIVATE_KEY:", config.privateKeyLoaded ? "<loaded>" : "<missing>")
  console.log("ESCROW_OPERATOR_ADDRESS (env):", config.envAddress ?? "<missing>")
  console.log("ESCROW_OPERATOR_ADDRESS (derived):", config.derivedAddress ?? "<missing>")
  console.log("ESCROW_CONTRACT_ADDRESS:", config.contractAddress ?? "<missing>")
  if (config.envAddress && config.derivedAddress && typeof config.derivedAddress === "string") {
    if (config.envAddress.toLowerCase() !== config.derivedAddress.toLowerCase()) {
      console.warn("WARNING: Local ESCROW_OPERATOR_ADDRESS does not match derived address from the private key.")
    }
  }
  console.log("")
}

async function fetchRemoteDebug(remoteUrl) {
  const url = new URL(remoteUrl)
  if (!url.pathname.endsWith("/api/debug")) {
    url.pathname = url.pathname.replace(/\/?$/, "/api/debug")
  }
  const fetchUrl = url.toString()
  console.log(`Fetching remote debug from: ${fetchUrl}`)
  const res = await fetch(fetchUrl, { method: "GET" })
  if (!res.ok) {
    throw new Error(`Remote debug returned ${res.status} ${res.statusText}`)
  }
  return await res.json()
}

function compareConfigs(local, remote) {
  console.log("=== Comparison ===")
  if (!remote) {
    console.log("No remote debug JSON to compare.")
    return
  }

  const remoteAddress = remote.escrowOperator?.address ?? null
  const remoteBalance = remote.escrowOperator?.balance ?? null
  const remoteConfigured = remote.isEscrowConfigured
  const localAddress = local.derivedAddress || local.envAddress || null

  console.log("Local operator address:", localAddress)
  console.log("Remote operator address:", remoteAddress ?? "<missing>")
  console.log("Remote operator balance:", remoteBalance ?? "<missing>")
  console.log("Remote isEscrowConfigured:", remoteConfigured)
  console.log("")

  if (localAddress && remoteAddress && localAddress.toLowerCase() !== remoteAddress.toLowerCase()) {
    console.warn("WARNING: remote escrow operator address does not match local derived operator address.")
  }
  if (!remoteConfigured) {
    console.warn("WARNING: remote reports escrow is not configured.")
  }
  if (remoteBalance === "0.0") {
    console.warn("WARNING: remote operator has zero native balance.")
  }
}

async function main() {
  const repoRoot = process.cwd()
  loadEnvFile(path.join(repoRoot, ".env.development.local"))
  loadEnvFile(path.join(repoRoot, ".env"))

  const args = parseArgs()
  const localConfig = getLocalEscrowConfig()
  printLocalConfig(localConfig)

  if (args.remoteUrl) {
    try {
      const remoteDebug = await fetchRemoteDebug(args.remoteUrl)
      console.log("=== Remote debug payload ===")
      console.log(JSON.stringify(remoteDebug, null, 2))
      console.log("")
      compareConfigs(localConfig, remoteDebug)
    } catch (err) {
      console.error("ERROR fetching remote debug:", err.message ?? String(err))
      process.exit(1)
    }
  } else {
    console.log("No remote URL provided. Use --url <deployed-app-url> to compare against /api/debug.")
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err)
  process.exit(1)
})
