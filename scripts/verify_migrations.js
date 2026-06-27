// Verify refund tracking columns
const pg = require('pg');
pg.defaults.ssl = false;

const pool = new pg.Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.wdssjefofxjifltsuidb',
  password: '7mCAAczHws3Ak8Yb',
  ssl: false
});

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_fees' 
      AND column_name IN ('refund_external_id', 'refunded_at', 'refund_tx_hash')
      ORDER BY ordinal_position
    `);
    
    if (res.rows.length === 3) {
      console.log('✓ All refund tracking columns verified:');
      res.rows.forEach(row => console.log('  - ' + row.column_name + ' (' + row.data_type + ')'));
    } else {
      console.error('✗ Expected 3 columns, found ' + res.rows.length);
      process.exit(1);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
