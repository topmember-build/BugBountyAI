process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

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

;(async function(){
  try {
    const repoRoot = path.resolve(__dirname, '..')
    const envPath = path.join(repoRoot, '.env.development.local')
    const env = loadEnv(envPath)
    const conn = env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING
    if (!conn) {
      console.error('No POSTGRES_URL found in .env.development.local')
      process.exit(1)
    }

    const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
    await client.connect()
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_fees' AND column_name IN ('escrow_fee','net_amount')")
    console.log('columns:', JSON.stringify(res.rows, null, 2))
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error('check failed', err)
    process.exit(2)
  }
})()
