"use client"

import { AuditSubmitForm } from "@/components/dashboard/audit-submit-form"
import { AuditsList } from "@/components/dashboard/audits-list"
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel"
import { WalletCard } from "@/components/dashboard/wallet-card"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const shouldAutoSetupWallet = searchParams.get("walletSetup") === "1"
  const archivePath = searchParams.get("archivePath")
  const archiveFilename = searchParams.get("archiveFilename")
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
      <AuditSubmitForm
        feeTransactionId={feeTransactionId}
        archivePath={archivePath}
        archiveFilename={archiveFilename}
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
