import { AuditSubmitForm } from "@/components/dashboard/audit-submit-form"
import { AuditsList } from "@/components/dashboard/audits-list"
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-display tracking-tight mb-2">Launch an audit</h1>
        <p className="text-muted-foreground">
          Point the agent swarm at a repository. Findings are scored and rewards are settled in USDC.
        </p>
      </div>

      <AuditSubmitForm />

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
