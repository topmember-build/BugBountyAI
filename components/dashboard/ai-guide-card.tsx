"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { CircleHelp, Send, Sparkles, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { buildAiGuideSteps, getAiGuideResponse } from "@/lib/ai-guide"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

interface ChatMessage {
  id: number
  role: "assistant" | "user"
  content: string
}

export function AiGuideCard() {
  const { data } = useSWR<{ wallet?: { address: string } | null; feeTransactionId?: string | null }>('/api/wallet', fetcher, {
    revalidateOnFocus: false,
  })

  const walletReady = Boolean(data?.wallet)
  const feeAuthorized = Boolean(data?.feeTransactionId)
  const steps = buildAiGuideSteps({ walletReady, feeAuthorized })
  const progress = Math.min(100, Math.round(((walletReady ? 1 : 0) + (feeAuthorized ? 1 : 0)) / 2 * 100))
  const recommendedAction = !walletReady
    ? "Set up your wallet"
    : !feeAuthorized
      ? "Authorize the audit fee"
      : "Submit your first audit"
  const [prompt, setPrompt] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "I can help you get started. Ask me what to do next or tap one of the quick suggestions.",
    },
  ])

  const handleAsk = (value?: string) => {
    const nextPrompt = (value ?? prompt).trim()
    if (!nextPrompt) return

    const answer = getAiGuideResponse({ walletReady, feeAuthorized, prompt: nextPrompt })

    setMessages((current) => [
      ...current,
      { id: current.length + 1, role: "user", content: nextPrompt },
      { id: current.length + 2, role: "assistant", content: answer },
    ])
    setPrompt("")
  }

  useEffect(() => {
    const storedValue = window.localStorage.getItem("ai-guide-dismissed")
    if (storedValue === "true") {
      setIsDismissed(true)
    }

    const timer = window.setTimeout(() => setIsVisible(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    window.localStorage.setItem("ai-guide-dismissed", "true")
  }

  const handleRestore = () => {
    setIsDismissed(false)
    window.localStorage.removeItem("ai-guide-dismissed")
  }

  const quickPrompts = [
    "What should I do first?",
    "How does this product work?",
    "How do I submit an audit?",
  ]

  if (isDismissed) {
    return (
      <Button variant="outline" onClick={handleRestore} className="w-fit gap-2">
        <CircleHelp className="h-4 w-4" />
        Show AI guide
      </Button>
    )
  }

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background transition-all duration-500 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI guide for new users</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} aria-label="Dismiss AI guide">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          A simple walkthrough that explains what to do first and how the product fits together.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Recommended next action</p>
            <Badge variant="secondary">{progress}% ready</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{recommendedAction}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background/70">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="rounded-lg border border-border/70 bg-background/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{step.title}</p>
                <Badge variant="secondary">{step.badge}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/70 bg-background/70 p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleAsk(item)}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary transition hover:bg-primary/20"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {messages.map((message) => (
              <div key={message.id} className={`rounded-lg p-2 text-sm ${message.role === "assistant" ? "bg-muted/60" : "bg-primary/10 text-primary"}`}>
                <span className="font-medium">{message.role === "assistant" ? "Guide" : "You"}: </span>
                {message.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleAsk()
            }}
            className="mt-3 flex gap-2"
          >
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask what to do next..."
            />
            <Button type="submit" size="icon" aria-label="Send guide prompt">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
