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

  const sql = `
  CREATE TABLE IF NOT EXISTS public.wallet_nonces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    address text NOT NULL,
    message text NOT NULL,
    nonce text NOT NULL,
    used boolean NOT NULL DEFAULT false,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_wallet_nonces_address ON public.wallet_nonces (address);

  CREATE TABLE IF NOT EXISTS public.user_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    address text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, address)
  );
  CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets (user_id);

  ALTER TABLE IF EXISTS public.audits ADD COLUMN IF NOT EXISTS archive_path text;
  ALTER TABLE IF EXISTS public.audits ADD COLUMN IF NOT EXISTS archive_filename text;
  ALTER TABLE IF EXISTS public.audits ADD COLUMN IF NOT EXISTS archive_uploaded_at timestamptz;

  ALTER TABLE IF EXISTS public.agents ADD COLUMN IF NOT EXISTS owner_id text NOT NULL DEFAULT '';
  ALTER TABLE IF EXISTS public.agents ADD COLUMN IF NOT EXISTS focus_areas text;
  ALTER TABLE IF EXISTS public.agents ADD COLUMN IF NOT EXISTS system_prompt text;
  `

  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    console.log('Connected to Postgres, applying missing migrations...')
    await client.query(sql)
    console.log('Missing migrations applied successfully.')
  } catch (err) {
    console.error('Failed to apply missing migrations:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
