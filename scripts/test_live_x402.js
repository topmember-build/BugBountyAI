async function testLive() {
  console.log("1. Requesting without proof (expect 402):")
  const res1 = await fetch("http://localhost:3000/api/v1/audits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: "https://github.com/Uniswap/v4-core" }),
  })
  console.log("   HTTP Status:", res1.status)
  const quoteData = await res1.json()
  console.log("   Quote Amount:", quoteData.x402_quote?.amount_usdc, quoteData.x402_quote?.token_symbol)

  console.log("\n2. Requesting WITH x402 Payment Proof (expect 200 + findings):")
  const res2 = await fetch("http://localhost:3000/api/v1/audits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-402-Payment-Proof": "0x98fbc923a102bc45d78129034afc92019bca1234567890abcdef1234567890abcdef",
    },
    body: JSON.stringify({
      contract_code: "pragma solidity ^0.8.0; contract Vault { mapping(address => uint) balances; function withdraw() public { msg.sender.call(''); balances[msg.sender] = 0; } }",
      engine: "basic-scan",
    }),
  })
  console.log("   HTTP Status:", res2.status)
  const result = await res2.json()
  console.log("   Response Body:", JSON.stringify(result, null, 2))
}

testLive().catch(console.error)
