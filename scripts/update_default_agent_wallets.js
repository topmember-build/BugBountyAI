const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { ethers } = require('ethers')

const repoRoot = path.resolve(__dirname, '..')
const envPath = path.join(repoRoot, '.env.development.local')
const env = {}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
  if (match) env[match[1]] = match[2]
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const DEFAULT_AGENT_WALLET = '0x95D10619338707703475239EC03120A8266AF995'
const defaultAgents = ['sentinel', 'logician', 'chainwarden', 'dependa']

async function main() {
  for (const slug of defaultAgents) {
    const { data, error } = await supabase
      .from('agents')
      .update({ wallet_address: DEFAULT_AGENT_WALLET })
      .eq('slug', slug)

    if (error) {
      console.error('failed to update agent wallet for', slug, error.message)
    } else {
      console.log('updated wallet_address for', slug)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
