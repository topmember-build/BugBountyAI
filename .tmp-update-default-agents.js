const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

const envPath = path.join(process.cwd(), '.env.development.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)=(?:'|")?(.*?)(?:'|")?\s*$/i);
  if (match) env[match[1]] = match[2];
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function buildDefaultWallet(seed) {
  return ethers.computeAddress(ethers.id(`bugbounty-agent-wallet-${seed}`));
}

const updates = [
  { slug: 'sentinel', name: 'Sentinel', agent_type: 'security', description: 'Hunts injection, auth, and access-control vulnerabilities.', focus_areas: 'Authentication, OWASP Top 10, SQL injection, XSS', system_prompt: 'You are Sentinel, a disciplined security agent for bug bounty work.', avatar_seed: 'sentinel', wallet_address: buildDefaultWallet('sentinel'), findings_count: 182, total_earned: 3.45406, reputation: 5235 },
  { slug: 'logician', name: 'Logician', agent_type: 'logic', description: 'Detects business-logic flaws and broken invariants.', focus_areas: 'Business logic, invariants, race conditions, authorization', system_prompt: 'You are Logician, a logic-focused agent for bug bounty work.', avatar_seed: 'logician', wallet_address: buildDefaultWallet('logician'), findings_count: 72, total_earned: 1.05174, reputation: 2567 },
  { slug: 'chainwarden', name: 'ChainWarden', agent_type: 'smart_contract', description: 'Audits smart contracts for reentrancy and economic exploits.', focus_areas: 'Reentrancy, access control, overflow, economic attacks', system_prompt: 'You are ChainWarden, a smart contract-focused agent.', avatar_seed: 'chainwarden', wallet_address: buildDefaultWallet('chainwarden'), findings_count: 36, total_earned: 0.8925, reputation: 2564 },
  { slug: 'dependa', name: 'Dependa', agent_type: 'dependency', description: 'Scans dependency trees for known CVEs and supply-chain risk.', focus_areas: 'Dependencies, CVEs, supply-chain, package hygiene', system_prompt: 'You are Dependa, a dependency-focused agent for bug bounty work.', avatar_seed: 'dependa', wallet_address: buildDefaultWallet('dependa'), findings_count: 51, total_earned: 0.49136, reputation: 1872 },
];

(async () => {
  for (const agent of updates) {
    const { data, error } = await supabase
      .from('agents')
      .upsert({
        slug: agent.slug,
        owner_id: 'system',
        name: agent.name,
        agent_type: agent.agent_type,
        description: agent.description,
        focus_areas: agent.focus_areas,
        system_prompt: agent.system_prompt,
        avatar_seed: agent.avatar_seed,
        wallet_address: agent.wallet_address,
        findings_count: agent.findings_count,
        total_earned: agent.total_earned,
        reputation: agent.reputation,
      }, { onConflict: 'slug' })
      .select('slug, wallet_address, total_earned, reputation, findings_count, name')
      .single();

    if (error) {
      console.error('update failed', agent.slug, error.message);
    } else {
      console.log('updated', JSON.stringify(data));
    }
  }
})();
