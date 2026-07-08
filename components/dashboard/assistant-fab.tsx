"use client"

import { useEffect, useState } from "react"
import { Bot, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssistantPanel } from "@/components/dashboard/assistant-panel"

export function AssistantFab() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem("assistant-open")
    if (stored === "true") {
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("assistant-open", isOpen ? "true" : "false")
  }, [isOpen])

  return (
    <>
      <Button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-xl transition-all hover:scale-[1.02] hover:bg-primary/90"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Toggle assistant"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        <span className="font-medium">{isOpen ? "Hide assistant" : "Show assistant"}</span>
      </Button>

      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-50 w-[min(92vw,420px)]">
          <AssistantPanel compact />
        </div>
      ) : null}
    </>
  )
}
