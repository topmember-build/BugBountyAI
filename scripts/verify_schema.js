const fs = require('fs');
const { Client } = require('pg');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
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

const tables = [
  'audit_fees',
  'audits',
  'agents',
  'wallet_nonces',
  'user_wallets',
  'agent_contracts',
];

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    for (const table of tables) {
      const res = await client.query(
        `select table_schema, table_name from information_schema.tables where table_name=$1 order by table_schema`,
        [table]
      );
      console.log(table, ':', res.rows);
      if (res.rows.length > 0) {
        const colRes = await client.query(
          `select column_name, data_type, is_nullable from information_schema.columns where table_name=$1 order by ordinal_position`,
          [table]
        );
        console.log('  columns:', colRes.rows.map((r) => `${r.column_name}(${r.data_type},${r.is_nullable})`).join(', '));
      }
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
