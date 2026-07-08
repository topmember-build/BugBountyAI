"use client"

import { useState, useRef, useEffect } from "react"
import useSWR from "swr"
import { Bot, Send, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json())

// Format assistant message content for better readability
function formatMessageContent(content: string) {
  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/)
  
  return paragraphs.map((paragraph, idx) => {
    // Check if paragraph contains bullet points or numbered items
    const lines = paragraph.split("\n").filter(line => line.trim())
    
    const isList = lines.some(line => /^[-*•]|\d+\./.test(line.trim()))
    
    if (isList) {
      return (
        <ul key={idx} className="space-y-2 mb-3">
          {lines.map((line, lineIdx) => {
            const content = line.replace(/^[-*•]\s*|\d+\.\s*/, "").trim()
            return (
              <li key={lineIdx} className="flex gap-2 text-sm leading-relaxed">
                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{content}</span>
              </li>
            )
          })}
        </ul>
      )
    }
    
    return (
      <p key={idx} className="text-sm leading-relaxed mb-3 last:mb-0">
        {paragraph}
      </p>
    )
  })
}

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

  const { t } = useLanguage()

  const defaultAssistantMessage = t("ask_anything")

  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") {
      return [
        {
          id: 1,
          role: "assistant",
          content: defaultAssistantMessage,
        },
      ]
    }

    try {
      const stored = window.localStorage.getItem("assistant-messages")
      if (!stored) return [
        {
          id: 1,
          role: "assistant",
          content: defaultAssistantMessage,
        },
      ]

      const parsed = JSON.parse(stored) as Message[]
      return Array.isArray(parsed) && parsed.length ? parsed : [
        {
          id: 1,
          role: "assistant",
          content: defaultAssistantMessage,
        },
      ]
    } catch {
      return [
        {
          id: 1,
          role: "assistant",
          content: defaultAssistantMessage,
        },
      ]
    }
  })
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

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
        { id: Date.now() + 1, role: "assistant" as const, content: body.message ?? "I'm here to help." },
      ])
    } catch (error) {
      persistMessages([
        ...messages,
        nextUserMessage,
        { id: Date.now() + 2, role: "assistant" as const, content: "I'm unable to answer that right now. Please try again in a moment." },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const quickQuestions = [
    t("what_first"),
    t("how_works"),
    t("why_wallet"),
    t("how_submit"),
  ]

  return (
    <Card className={`flex flex-col border-border shadow-lg transition-all ${compact ? "h-[500px] sm:h-[600px]" : "h-auto"} dark:border-border/50 dark:bg-slate-900/30`}>
      <CardHeader className={`pb-4 border-b border-border dark:border-border/50 ${compact ? "flex-shrink-0" : ""}`}>
          <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-primary/5">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{t("ai_assistant")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("ask_anything")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`flex flex-col gap-4 ${compact ? "flex-1 overflow-hidden flex-col" : ""}`}>
        {/* Quick Questions */}
        <div className={`flex flex-wrap gap-2 ${compact ? "flex-shrink-0" : ""}`}>
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => handleSubmit(question)}
              disabled={isThinking}
              className="rounded-full border border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 px-3 py-1.5 text-xs sm:text-sm text-primary font-medium transition hover:bg-primary/15 dark:hover:bg-primary/20 hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {question}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div className={`flex-1 overflow-y-auto space-y-4 rounded-xl border border-border/50 dark:border-border/30 bg-muted/30 dark:bg-slate-800/50 p-4 ${compact ? "min-h-0 scroll-smooth" : ""}`}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <p className="text-sm text-muted-foreground">{t("start_conversation")}</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-xs sm:max-w-sm rounded-lg px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-background dark:bg-slate-800 text-foreground border border-border/50 dark:border-border/30 shadow-sm"
                      : "bg-primary text-primary-foreground shadow-md"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="space-y-0">
                      {formatMessageContent(message.content)}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {isThinking && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-background dark:bg-slate-800 text-foreground border border-border/50 dark:border-border/30 rounded-lg px-4 py-3 flex gap-2 items-center shadow-sm">
                <span className="text-sm font-medium">{t("thinking")}</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
          className="flex gap-2 flex-shrink-0"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the platform..."
            disabled={isThinking}
            className="text-sm dark:bg-slate-800 dark:border-border/30"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send assistant message"
            disabled={isThinking || !input.trim()}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
