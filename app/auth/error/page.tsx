import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/landing/logo"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <LogoMark className="w-9 h-9" />
          <span className="text-xl font-display tracking-tight">
            BugBounty<span className="text-primary">AI</span>
          </span>
        </Link>

        <div className="border border-border rounded-xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-display tracking-tight mb-2">Authentication error</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {params?.error ?? "Something went wrong during authentication. Please try again."}
          </p>
          <Button
            asChild
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11"
          >
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
