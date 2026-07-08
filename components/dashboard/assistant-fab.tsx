"use client"

import { useEffect, useState } from "react"
import { Bot, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssistantPanel } from "@/components/dashboard/assistant-panel"
import { useLanguage } from "@/lib/language-context"

export function AssistantFab() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const stored = window.localStorage.getItem("assistant-open")
    if (stored === "true") {
      setIsOpen(true)
    }
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    window.localStorage.setItem("assistant-open", isOpen ? "true" : "false")
  }, [isOpen])

  return (
    <>
      {/* FAB Button - Floating Action Button */}
      <Button
        type="button"
        className={`fixed z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-xl transition-all hover:scale-[1.02] hover:bg-primary/90 ${
          isMobile ? "bottom-6 right-4 left-4 justify-center sm:left-auto sm:right-6" : "bottom-6 right-6"
        }`}
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Toggle assistant"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        <span className="font-medium">{isOpen ? t("hide_assistant") : t("show_assistant")}</span>
      </Button>

      {/* Assistant Panel - Full Screen on Mobile, Fixed on Desktop */}
      {isOpen ? (
        <div className={`fixed z-40 ${
          isMobile 
            ? "inset-0 bg-black/50 overflow-hidden flex flex-col"
            : "bottom-24 right-6 w-[min(92vw,420px)]"
        }`}>
          {/* Mobile: Full screen assistant */}
          {isMobile && (
            <div className="flex flex-col h-full bg-background">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">{t("ai_assistant")}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close assistant"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AssistantPanel compact />
              </div>
            </div>
          )}
          
          {/* Desktop: Card style */}
          {!isMobile && <AssistantPanel compact />}
        </div>
      ) : null}
    </>
  )
}
