const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const repoRoot = path.resolve(__dirname, '..')
const envPath = path.join(repoRoot, '.env.development.local')
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
  if (m) env[m[1]] = m[2]
}
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('Missing Supabase config')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const auditId = process.argv[2]
if (!auditId) {
  console.error('Usage: node scripts/query_audit_details.js <auditId>')
  process.exit(1)
}

async function main() {
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id,repo_url,branch,status,created_at,completed_at,findings_count,total_reward')
    .eq('id', auditId)
    .single()

  if (auditError) {
    console.error('Audit query error:', auditError)
    process.exit(1)
  }

  const { data: findings, error: findingsError } = await supabase
    .from('findings')
    .select('id,title,severity,confidence,agent_id,reward_amount,reward_status')
    .eq('audit_id', auditId)

  if (findingsError) {
    console.error('Findings query error:', findingsError)
    process.exit(1)
  }

  const findingIds = (findings || []).map((f) => f.id)
  let rewards = []
  if (findingIds.length > 0) {
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('id,finding_id,user_id,agent_id,amount,status,provider,tx_hash,external_id,settled_at')
      .in('finding_id', findingIds)

    if (rewardsError) {
      console.error('Rewards query error:', rewardsError)
      process.exit(1)
    }
    rewards = rewardsData
  }

  console.log('audit:', JSON.stringify(audit, null, 2))
  console.log('findings:', JSON.stringify(findings, null, 2))
  console.log('rewards:', JSON.stringify(rewards, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
