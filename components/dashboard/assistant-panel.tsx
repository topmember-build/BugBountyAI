"use client"

import { useState } from "react"
import useSWR from "swr"
import { Bot, Send, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

interface Message {
  id: number
  role: "assistant" | "user"
  content: string
}

interface AssistantPanelProps {
  compact?: boolean
}

export function AssistantPanel({ compact = false }: AssistantPanelProps) {
  const { data } = useSWR<{ wallet?: { address: string } | null; feeTransactionId?: string | null }>('/api/wallet', fetcher, {
    revalidateOnFocus: false,
  })

  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") {
      return [
        {
          id: 1,
          role: "assistant",
          content: "I can help you understand the platform and tell you what to do next. Ask me anything about setup, audits, wallets, or rewards.",
        },
      ]
    }

    try {
      const stored = window.localStorage.getItem("assistant-messages")
      if (!stored) return [
        {
          id: 1,
          role: "assistant",
          content: "I can help you understand the platform and tell you what to do next. Ask me anything about setup, audits, wallets, or rewards.",
        },
      ]

      const parsed = JSON.parse(stored) as Message[]
      return Array.isArray(parsed) && parsed.length ? parsed : [
        {
          id: 1,
          role: "assistant",
          content: "I can help you understand the platform and tell you what to do next. Ask me anything about setup, audits, wallets, or rewards.",
        },
      ]
    } catch {
      return [
        {
          id: 1,
          role: "assistant",
          content: "I can help you understand the platform and tell you what to do next. Ask me anything about setup, audits, wallets, or rewards.",
        },
      ]
    }
  })
  const [isThinking, setIsThinking] = useState(false)

  const persistMessages = (nextMessages: Message[]) => {
    setMessages(nextMessages)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("assistant-messages", JSON.stringify(nextMessages))
    }
  }

  const handleSubmit = async (value?: string) => {
    const nextPrompt = (value ?? input).trim()
    if (!nextPrompt) return

    const nextUserMessage = { id: Date.now(), role: "user" as const, content: nextPrompt }
    persistMessages([...messages, nextUserMessage])
    setInput("")
    setIsThinking(true)

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: nextPrompt,
          history: messages.map(({ role, content }) => ({ role, content })),
          context: {
            walletReady: Boolean(data?.wallet),
            feeAuthorized: Boolean(data?.feeTransactionId),
            page: "dashboard",
          },
        }),
      })

      const body = await response.json()
      persistMessages([
        ...messages,
        nextUserMessage,
        { id: Date.now() + 1, role: "assistant" as const, content: body.message ?? "I’m here to help." },
      ])
    } catch (error) {
      persistMessages([
        ...messages,
        nextUserMessage,
        { id: Date.now() + 2, role: "assistant" as const, content: "I’m unable to answer that right now. Please try again in a moment." },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const quickQuestions = [
    "What should I do first?",
    "How does this platform work?",
    "Why do I need a wallet?",
    "How do I submit an audit?",
  ]

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background ${compact ? "shadow-xl" : ""}`}>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI assistant</CardTitle>
        </div>
        <CardDescription>
          Ask anything about the product, onboarding, wallet setup, fees, or audits.
        </CardDescription>
      </CardHeader>
      <CardContent className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => handleSubmit(question)}
              className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary transition hover:bg-primary/20"
            >
              {question}
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 bg-background/70 p-3">
          {messages.map((message) => (
            <div key={message.id} className={`rounded-lg p-2 text-sm ${message.role === "assistant" ? "bg-muted/60" : "bg-primary/10 text-primary"}`}>
              <span className="font-medium">{message.role === "assistant" ? "Assistant" : "You"}: </span>
              {message.content}
            </div>
          ))}
          {isThinking ? (
            <div className="rounded-lg bg-muted/60 p-2 text-sm text-muted-foreground">
              <span className="font-medium">Assistant: </span>
              Thinking...
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the platform..."
          />
          <Button type="submit" size="icon" aria-label="Send assistant message">
            <Send className="h-4 w-4" />
          </Button>
        </form>

      </CardContent>
    </Card>
  )
}
