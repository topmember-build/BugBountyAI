import "server-only"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAiGuideResponse } from "@/lib/ai-guide"

const assistantKnowledge = [
  "BugBountyAI is an autonomous AI bug bounty marketplace and security audit platform on Arc Testnet.",
  "Hosts (sponsors & protocol teams) can host competitions and bounties by setting a Prize Pool and paying a $50 USDC Flat Hosting Fee.",
  "The $50 USDC Flat Hosting Fee covers static analysis, LLM inference tokens, and isolated sandbox runtime provisioning.",
  "Prize pools are locked on-chain in the BugBountyEscrow smart contract (0x3b2b4345a5327e27261a51ee0de57be29dffbbdd) on Arc Testnet.",
  "There is a 3% Protocol Escrow Fee deducted from prize pools for auditor payout orchestration, returning 97% to winning security agents.",
  "Hosts can connect External Web3 Wallets (MetaMask, Rabby, Coinbase Wallet, Trust Wallet, OKX, Phantom EVM) or paste custom EVM addresses as their refund & recovery wallet.",
  "Hosts receive a secret Host Access Code (e.g. HOST-BOUNTY-XXXXX) upon competition creation, which grants management and payout settlement permissions.",
  "Key rotation / code recovery requires verification using the registered host refund wallet address.",
  "Hosts must declare any prior audits and findings to ensure fair judging for competing AI agent swarms.",
  "AI Agent Swarms (Sentinel-V4, LogicAudit, ContractVanguard) audit repositories, score findings by severity (Critical, High, Medium, Low), and receive instant USDC rewards.",
  "The Arena / Live Bounties hub displays active competitions, prize pools, competing swarms, and AI judges tribunal.",
  "New users can connect wallets, authorize audit fees, submit code (GitHub, ZIP, or pasted Solidity), and view live audit progress.",
].join("\n")

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const message = typeof body?.message === "string" ? body.message.trim() : ""

    if (!message) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 })
    }

    const context = typeof body?.context === "object" && body.context ? body.context : {}
    const history = Array.isArray(body?.history) ? body.history : []
    const conversationHistory = history
      .filter((item: any) => item && typeof item.content === "string")
      .map((item: any) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content}`)
      .join("\n")
    const fallbackMessage = getAiGuideResponse({
      walletReady: Boolean(context?.walletReady),
      feeAuthorized: Boolean(context?.feeAuthorized),
      prompt: message,
    })

    const model = process.env.BUGBOUNTY_MODEL ?? "openai/gpt-5-mini"
    const page = typeof context?.page === "string" ? context.page : "dashboard"
    const walletReady = Boolean(context?.walletReady)
    const feeAuthorized = Boolean(context?.feeAuthorized)

    try {
      const { text } = await generateText({
        model,
        system: [
          "You are BugBountyAI Assist, a helpful product copilot for a bug bounty platform.",
          "Explain the product clearly, guide new users through setup and submission, and keep answers concise.",
          "Use the provided knowledge base to answer questions accurately.",
          "If the user asks for a next step, give a specific action they can take immediately.",
          `Knowledge base: ${assistantKnowledge}`,
        ].join("\n"),
        prompt: [
          `User question: ${message}`,
          `Context: walletReady=${walletReady}, feeAuthorized=${feeAuthorized}, page=${page}`,
          conversationHistory ? `Conversation history:\n${conversationHistory}` : undefined,
          "If the user is not yet ready, recommend the next immediate action.",
        ].filter(Boolean).join("\n"),
      })

      const answer = text?.trim()
      return NextResponse.json({ message: answer || fallbackMessage, source: "ai" })
    } catch (error) {
      console.warn("Assistant fallback triggered", error)
      return NextResponse.json({ message: fallbackMessage, source: "knowledge" })
    }
  } catch (error) {
    console.error("Assistant route failed", error)
    return NextResponse.json({ error: "Unable to handle that request right now." }, { status: 500 })
  }
}
