const fs = require('fs');
const { Client } = require('pg');

const env = fs.readFileSync('.env.development.local', 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=]+)=['"]?(.*?)["']?$/);
  if (m) acc[m[1]] = m[2];
  return acc;
}, {});

const conn = env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL_NON_POOLING;
if (!conn) {
  console.error('No POSTGRES_URL found in .env.development.local');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query("select table_schema, table_name from information_schema.tables where table_name='users' order by table_schema");
    console.log('tables named users:', res.rows);
    const res2 = await client.query("select table_schema, table_name from information_schema.tables where table_schema='auth' and table_name='users'");
    console.log('auth.users rows:', res2.rows);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
