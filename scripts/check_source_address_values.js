const pg = require('pg');

const pool = new pg.Pool({
  connectionString: 'postgres://postgres.wdssjefofxjifltsuidb:7mCAAczHws3Ak8Yb@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    const countResult = await client.query(`
      SELECT COUNT(*) AS total, COUNT(source_address) AS with_source_address
      FROM public.audit_fees;
    `);
    console.log('COUNT:', countResult.rows);

    const sampleResult = await client.query(`
      SELECT id, user_id, transaction_id, source_address
      FROM public.audit_fees
      WHERE source_address IS NOT NULL
      LIMIT 5;
    `);
    console.log('SAMPLE:', sampleResult.rows);
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
