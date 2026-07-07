"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handle = async () => {
      const supabase = createClient()
      // If there's a `code` query param (OAuth/code flow), send it to the
      // server to exchange for a session. If not, try to parse fragment tokens
      // (magic link) using the browser client.
      const url = new URL(window.location.href)
      const code = url.searchParams.get("code")

      if (code) {
        try {
          const resp = await fetch("/api/auth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
            credentials: "include",
          })
          const body = await resp.json()
          if (!resp.ok) {
            console.error("Code exchange failed:", body)
            router.replace("/auth/error")
            return
          }
          router.replace("/auth/confirmation-success")
          return
        } catch (err) {
          console.error("Failed to exchange code:", err)
          router.replace("/auth/error")
          return
        }
      }

      if (!supabase) {
        router.replace("/auth/error")
        return
      }

      try {
        // Handle fragment-based sessions (magic-link / token in hash)
        // @ts-ignore - method exists on the Supabase client at runtime
        const { error } = await supabase.auth.getSessionFromUrl()
        if (error) {
          console.error("Auth callback error:", error)
          router.replace("/auth/error")
        } else {
          router.replace("/auth/confirmation-success")
        }
      } catch (e) {
        console.error("Unexpected error handling auth callback:", e)
        router.replace("/auth/error")
      }
    }

    handle()
  }, [router])

  return <div className="p-6">Signing you in…</div>
}
