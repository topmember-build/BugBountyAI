// Apply refund tracking migrations to Supabase
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or service key')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Since we can't directly execute SQL via REST, we'll use pg_exec if available
// or provide instructions for manual application
async function checkColumns() {
  console.log('Checking if refund tracking columns exist...')
  try {
    const { data, error } = await admin
      .from('audit_fees')
      .select('refund_external_id, refunded_at, refund_tx_hash')
      .limit(1)
    
    if (error && error.message.includes('column')) {
      console.log('❌ Columns not found. You need to apply the migrations manually.')
      console.log('\nVisit: ' + SUPABASE_URL + '/project/sql/new')
      console.log('\nPaste and execute this SQL:\n')
      console.log(`
ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refund_external_id varchar;

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE IF EXISTS public.audit_fees
ADD COLUMN IF NOT EXISTS refund_tx_hash varchar;
      `)
      process.exit(1)
    }
    console.log('✓ All refund tracking columns exist!')
  } catch (err) {
    console.error('Error checking columns:', err.message)
    process.exit(1)
  }
}

checkColumns()
