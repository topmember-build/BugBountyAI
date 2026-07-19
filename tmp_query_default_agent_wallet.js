const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = {};
const envPath = path.join(process.cwd(), '.env.development.local');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const top = await supabase
    .from('agents')
    .select('id,slug,name,wallet_address,total_earned,findings_count')
    .order('total_earned', { ascending: false })
    .limit(20);
  if (top.error) {
    console.error('TOP ERR', top.error);
    process.exit(1);
  }
  console.log('TOP AGENTS:');
  console.dir(top.data, { depth: null });

  const match = await supabase
    .from('agents')
    .select('id,slug,name,wallet_address,total_earned,findings_count')
    .ilike('wallet_address', '0xdE6f%');
  if (match.error) {
    console.error('MATCH ERR', match.error);
    process.exit(1);
  }
  console.log('MATCH 0xdE6f*');
  console.dir(match.data, { depth: null });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
