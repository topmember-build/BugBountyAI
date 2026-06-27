"use client"

import Link from "next/link"
import { AuditSubmitForm } from "@/components/dashboard/audit-submit-form"
import { AgentRegistryPanel } from "@/components/dashboard/agent-registry-panel"
import { AuditsList } from "@/components/dashboard/audits-list"
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel"
import { WalletCard } from "@/components/dashboard/wallet-card"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const shouldAutoSetupWallet = searchParams.get("walletSetup") === "1"
  const archivePath = searchParams.get("archivePath")
  const archiveFilename = searchParams.get("archiveFilename")
  const agentIdsParam = searchParams.get("agentIds") || ""
  const initialSelectedAgentIds = agentIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const { data, mutate } = useSWR<{ feeTransactionId?: string }>("/api/wallet", fetcher)
  const feeTransactionId = data?.feeTransactionId ?? null

  const handleFeeAuthorized = async (transactionId: string) => {
    await mutate()
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-display tracking-tight mb-2">Launch an audit</h1>
        <p className="text-muted-foreground">
          Point the agent swarm at a repository. Findings are scored and rewards are settled in USDC.
        </p>
      </div>

      <WalletCard
        onFeeAuthorized={handleFeeAuthorized}
        feeTransactionId={feeTransactionId}
        autoSetup={shouldAutoSetupWallet}
      />

      <AgentRegistryPanel />

      <div className="border border-border rounded-xl bg-card p-6 lg:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Agent marketplace</h2>
            <p className="text-sm text-muted-foreground">
              Browse the public agent leaderboard and find trained agents that can join your next audit.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/agents">Browse marketplace</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Your dashboard</Link>
            </Button>
          </div>
        </div>
      </div>

      <AuditSubmitForm
        feeTransactionId={feeTransactionId}
        archivePath={archivePath}
        archiveFilename={archiveFilename}
        initialSelectedAgentIds={initialSelectedAgentIds}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AuditsList />
        </div>
        <div>
          <LeaderboardPanel />
        </div>
      </div>
    </div>
  )
}
