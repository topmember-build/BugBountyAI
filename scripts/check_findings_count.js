process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const envFile = path.join(process.cwd(), '.env.development.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    let key = trimmed.slice(0, eq)
    let val = trimmed.slice(eq + 1)
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

const POSTGRES_URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL
if (!POSTGRES_URL) {
  console.error('Missing Postgres connection string in env.')
  process.exit(1)
}

const pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } })

async function main() {
  const agentsRes = await pool.query('SELECT id, name, findings_count FROM agents ORDER BY name')
  const countsRes = await pool.query('SELECT agent_id, COUNT(*) AS count FROM findings GROUP BY agent_id')
  const counts = new Map(countsRes.rows.map((r) => [r.agent_id, Number(r.count)]))

  console.log('Agent name | stored findings_count | actual findings rows | delta')
  let mismatches = 0
  for (const a of agentsRes.rows) {
    const actual = counts.get(a.id) ?? 0
    const stored = Number(a.findings_count ?? 0)
    const delta = actual - stored
    if (delta !== 0) {
      mismatches += 1
      console.log(`${a.name} | ${stored} | ${actual} | ${delta}`)
    }
  }

  if (mismatches === 0) {
    console.log('No findings_count mismatches found.')
  } else {
    console.log(`Found ${mismatches} mismatched agent(s).`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Error checking findings counts:', err)
  process.exit(1)
})
