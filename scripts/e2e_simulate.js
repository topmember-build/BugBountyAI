const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return {}
  const raw = fs.readFileSync(envPath, 'utf8')
  const lines = raw.split(/\r?\n/)
  const out = {}
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|\")?(.*?)(?:'|\")?\s*$/i)
    if (m) out[m[1]] = m[2]
  }
  return out
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..')
  const envPath = path.join(repoRoot, '.env.development.local')
  const env = loadEnv(envPath)

  const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase URL or service role key in .env.development.local')
    process.exit(1)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const email = `e2e+${Date.now()}@example.com`
  const password = `Test${Math.floor(Math.random() * 9000) + 1000}!`

  console.log('Creating test user via Auth Admin API:', email)
  let user
  try {
    const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apiKey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    const j = await resp.json()
    if (!resp.ok) throw new Error(JSON.stringify(j))
    user = j
  } catch (err) {
    console.error('Failed to create test user via Auth Admin API:', err.message || err)
    process.exit(2)
  }

  console.log('Created user id:', user.id)

  const txId = `sim_${Date.now()}`
  try {
    await admin.from('audit_fees').insert({
      user_id: user.id,
      transaction_id: txId,
      challenge_id: null,
      idempotency_key: `e2e_${Date.now()}`,
      amount: 1,
      status: 'settled',
    })
    console.log('Inserted audit_fees row with transaction_id', txId)
  } catch (err) {
    console.error('Failed to insert audit_fees:', err.message || err)
  }

  try {
    const { data: auditData, error: auditErr } = await admin
      .from('audits')
      .insert({
        user_id: user.id,
        repo_url: 'https://github.com/example/repo',
        branch: 'main',
        status: 'completed',
        repo_name: 'example/repo',
        findings_count: 0,
        total_reward: 0,
      })
      .select()
      .single()

    if (auditErr) throw auditErr
    console.log('Inserted audit row id:', auditData.id)
  } catch (err) {
    console.error('Failed to insert audit row:', err.message || err)
  }

  console.log('E2E simulation complete.')
  process.exit(0)
}

run()
