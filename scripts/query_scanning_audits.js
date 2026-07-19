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

async function main() {
  const { data, error } = await supabase
    .from('audits')
    .select('id,repo_url,branch,status,created_at,completed_at,findings_count,total_reward')
    .eq('status', 'scanning')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error(error)
    process.exit(1)
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
