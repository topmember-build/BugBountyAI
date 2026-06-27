// Apply refund migrations using Postgres connection
const { Pool } = require('pg');

const DATABASE_URL = process.env.POSTGRES_URL || 'postgres://postgres.wdssjefofxjifltsuidb:7mCAAczHws3Ak8Yb@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrations = [
  `ALTER TABLE IF EXISTS public.audit_fees
   ADD COLUMN IF NOT EXISTS refund_external_id varchar;`,
  `ALTER TABLE IF EXISTS public.audit_fees
   ADD COLUMN IF NOT EXISTS refunded_at timestamptz;`,
  `ALTER TABLE IF EXISTS public.audit_fees
   ADD COLUMN IF NOT EXISTS refund_tx_hash varchar;`,
];

async function applyMigrations() {
  const client = await pool.connect();
  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Applying migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
      console.log(`✓ Migration ${i + 1} applied`);
    }
    console.log('\n✓ All refund tracking migrations applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying migrations:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
