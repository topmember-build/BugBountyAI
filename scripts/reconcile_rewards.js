const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      let key = trimmed.slice(0, eq)
      let val = trimmed.slice(eq + 1)
      // strip surrounding quotes
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
    return true
  } catch (err) {
    console.error('Failed to load env file', filePath, err.message)
    return false
  }
}

// Try to load .env.development.local from repo root
const repoRoot = path.resolve(__dirname, '..')
const envFile = path.join(repoRoot, '.env.development.local')
if (fs.existsSync(envFile)) loadEnv(envFile)


const POSTGRES_URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL
if (!POSTGRES_URL) {
  console.error('Postgres connection string not found in environment (POSTGRES_URL).')
  process.exit(1)
}

const pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } })

async function main() {
  console.log('Querying settled rewards aggregated by agent (via Postgres)...')
  const sumsRes = await pool.query("SELECT agent_id, COALESCE(SUM(amount),0)::numeric AS total FROM rewards WHERE status = $1 GROUP BY agent_id", ['settled'])
  const sums = sumsRes.rows

  const agentsRes = await pool.query('SELECT id, name, total_earned FROM agents')
  const agents = agentsRes.rows

  const sumsByAgent = new Map()
  for (const row of sums) {
    sumsByAgent.set(row.agent_id, Number(row.total))
  }

  let updates = 0
  console.log('\nAgent reconciliation report:')
  console.log('Agent Name | Agent ID | Current total_earned | Computed settled total | Delta | Action')

  for (const a of agents) {
    const id = a.id
    const name = a.name ?? id
    const current = Number(a.total_earned ?? 0)
    const computed = Number(sumsByAgent.get(id) ?? 0)
    const delta = computed - current
    let action = 'none'
    if (Math.abs(delta) > 0.000001) {
      try {
        await pool.query('UPDATE agents SET total_earned = $1 WHERE id = $2', [computed, id])
        action = 'updated'
        updates++
      } catch (e) {
        action = `update_exception: ${e.message}`
      }
    }

    console.log(`${name} | ${id} | ${current.toFixed(6)} | ${computed.toFixed(6)} | ${delta.toFixed(6)} | ${action}`)
  }

  console.log(`\nReconciliation completed. Agents updated: ${updates}`)
  await pool.end()
}

main().catch((err) => {
  console.error('Unhandled error in reconciliation script:', err)
  process.exit(1)
})
