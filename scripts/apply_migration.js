// Allow connecting to development Supabase instances with self-signed certs
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
    const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i)
    if (m) out[m[1]] = m[2]
  }
  return out
}

async function run() {
  const repoRoot = path.resolve(__dirname, '..')
  const envPath = path.join(repoRoot, '.env.development.local')
  const env = loadEnv(envPath)

  const conn = env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING
  if (!conn) {
    console.error('No POSTGRES_URL found in .env.development.local')
    process.exit(1)
  }

  const migrationFile = process.argv[2] || '001_create_audit_fees.sql'
  const migrationPath = path.join(repoRoot, 'supabase', 'migrations', migrationFile)
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  // Allow connecting to Supabase-managed Postgres with self-signed certs
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    console.log('Connected to Postgres, running migration...')
    await client.query(sql)
    console.log('Migration applied successfully.')
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    try { await client.end() } catch {}
    process.exit(2)
  }
}

run()
