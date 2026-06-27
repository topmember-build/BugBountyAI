export type Severity = "critical" | "high" | "medium" | "low" | "info"
export type AgentType = "security" | "logic" | "dependency" | "smart_contract"
export type AuditStatus = "queued" | "scanning" | "completed" | "failed"
export type RewardStatus = "pending" | "settling" | "settled" | "failed"

export interface Agent {
  id: string
  slug: string
  name: string
  agent_type: AgentType
  description: string | null
  focus_areas?: string | null
  system_prompt?: string | null
  avatar_seed: string | null
  wallet_address: string | null
  findings_count: number
  total_earned: number
  reputation: number
  created_at: string
}

export interface Audit {
  id: string
  user_id: string
  repo_url: string
  repo_name: string | null
  branch: string | null
  status: AuditStatus
  findings_count: number
  total_reward: number
  archive_path?: string | null
  archive_filename?: string | null
  archive_uploaded_at?: string | null
  created_at: string
  completed_at: string | null
}

export interface Finding {
  id: string
  audit_id: string
  user_id: string
  agent_id: string | null
  title: string
  severity: Severity
  confidence: number
  category: string | null
  file_path: string | null
  line_start: number | null
  line_end: number | null
  description: string | null
  recommendation: string | null
  reward_amount: number
  reward_status: RewardStatus
  created_at: string
  agent?: Pick<Agent, "name" | "slug" | "agent_type"> | null
}

export interface Reward {
  id: string
  finding_id: string
  user_id: string
  agent_id: string | null
  amount: number
  currency: string
  status: RewardStatus
  provider: string
  tx_hash: string | null
  external_id: string | null
  created_at: string
  settled_at: string | null
}
