const pg = require('pg');

const pool = new pg.Pool({
  connectionString: 'postgres://postgres.wdssjefofxjifltsuidb:7mCAAczHws3Ak8Yb@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    const policies = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual::text, with_check::text
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'agents';
    `);
    console.log('policies:', policies.rows);

    const tableInfo = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid = 'public.agents'::regclass;
    `);
    console.log('tableInfo:', tableInfo.rows);
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
