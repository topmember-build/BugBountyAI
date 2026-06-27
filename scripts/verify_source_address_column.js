const pg = require('pg');

const pool = new pg.Pool({
  connectionString: 'postgres://postgres.wdssjefofxjifltsuidb:7mCAAczHws3Ak8Yb@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_fees'
        AND column_name = 'source_address'
    `);
    console.log(result.rows);
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
