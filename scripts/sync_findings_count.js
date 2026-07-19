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
  const countsRes = await pool.query('SELECT agent_id, COUNT(*) AS count FROM findings GROUP BY agent_id')
  const counts = new Map(countsRes.rows.map((r) => [r.agent_id, Number(r.count)]))

  let updated = 0
  for (const [agentId, actualCount] of counts) {
    const currentRes = await pool.query('SELECT name, findings_count FROM agents WHERE id = $1', [agentId])
    if (currentRes.rows.length === 0) continue
    const current = Number(currentRes.rows[0].findings_count ?? 0)
    const name = currentRes.rows[0].name
    if (current !== actualCount) {
      await pool.query('UPDATE agents SET findings_count = $1 WHERE id = $2', [actualCount, agentId])
      updated += 1
      console.log(`${name} | ${current} -> ${actualCount}`)
    }
  }

  console.log(`Updated findings_count for ${updated} agent(s).`)
  await pool.end()
}

main().catch((err) => {
  console.error('Error syncing findings_count:', err)
  process.exit(1)
})
