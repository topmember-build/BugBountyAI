"use client"

import { useEffect, useState } from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { LANGUAGES, useLanguage, type LanguageCode } from "@/lib/language-context"

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        aria-label="Select language"
        disabled
      >
        <Globe className="h-4 w-4" />
      </Button>
    )
  }

  const currentLang = LANGUAGES[language]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="Select language"
        >
          <span className="text-base">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Select Language
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code as LanguageCode)}
            className={`flex items-center gap-2 ${language === code ? "bg-primary/10" : ""}`}
          >
            <span className="text-lg">{flag}</span>
            <span className="flex-1">{name}</span>
            {language === code && (
              <span className="w-2 h-2 rounded-full bg-primary ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
