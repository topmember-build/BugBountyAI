const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function readEnv() {
  const repoRoot = path.resolve(__dirname, '..')
  const envPath = path.join(repoRoot, '.env.development.local')
  const env = {}
  if (!fs.existsSync(envPath)) return env
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function main() {
  const env = readEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.error('Missing Supabase URL or service role key in .env.development.local')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data, error } = await supabase.from('agents').select('id,slug,name,wallet_address,onchain_agent_id,onchain_registry_address,onchain_identity_status').eq('slug','sentinel').limit(1)
  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.log('No agent row for slug sentinel')
    process.exit(0)
  }
  console.log(JSON.stringify(data[0], null, 2))
}

main().catch((e)=>{console.error(e); process.exit(1)})
