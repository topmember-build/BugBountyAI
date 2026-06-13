import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client for trusted server-side operations that must
 * bypass RLS (e.g. updating shared agent leaderboard stats, recording reward
 * settlements). NEVER import this into client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase service role credentials are not configured.")
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
