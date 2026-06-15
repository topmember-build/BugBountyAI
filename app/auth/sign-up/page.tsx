"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogoMark } from "@/components/landing/logo"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const redirectUrl =
        process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ??
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
        `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <LogoMark className="w-9 h-9" />
          <span className="text-xl font-display tracking-tight">
            BugBounty<span className="text-primary">AI</span>
          </span>
        </Link>

        <div className="border border-border rounded-xl bg-card p-8">
          <h1 className="text-2xl font-display tracking-tight mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Deploy the agent swarm against your code.
          </p>

          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="repeat-password">Repeat password</Label>
              <Input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary underline underline-offset-4">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
