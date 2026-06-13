import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader email={user.email ?? ""} />
      <main className="max-w-[1200px] mx-auto px-6 lg:px-8 py-10">{children}</main>
    </div>
  )
}
