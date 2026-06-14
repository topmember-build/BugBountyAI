"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/landing/logo"
import { ArrowLeft, LogOut } from "lucide-react"

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="w-8 h-8" />
            <span className="text-lg font-display tracking-tight">
              BugBounty<span className="text-primary">AI</span>
            </span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 bg-transparent"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-muted-foreground">{email}</span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2 bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
