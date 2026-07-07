import "server-only"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getAiGuideResponse } from "@/lib/ai-guide"

const assistantKnowledge = [
  "BugBountyAI is a platform for launching autonomous security audits against repositories.",
  "New users should first connect a wallet, then authorize the audit fee, and then submit a repository for review.",
  "The wallet is used to pay audit fees and receive rewards or bounties.",
  "Audit fees are required before submissions can proceed and are charged in USDC.",
  "The dashboard shows wallet status, fee authorization state, audits, and leaderboard information.",
  "The docs page contains deeper explanations of wallet setup, fees, submissions, and agent swarms.",
  "Agent swarms are specialist AI agents that review repositories for vulnerabilities.",
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
