Run Supabase migrations locally or against your project to apply the new `agent_contracts` table.

Example (using supabase CLI):

```bash
# from project root
supabase db push --project-ref your-project-ref
# or run SQL directly
psql $SUPABASE_DB_URL -f supabase/migrations/005_create_agent_contracts.sql
```

The migration creates `agent_contracts` with `metadata` JSONB. After applying, you can trigger the on-chain metadata refresh endpoint:

- POST `/api/wallets/contracts/refresh` (authenticated) — refreshes `name`/`symbol` into `agent_contracts.metadata`.

Set `ALCHEMY_API_KEY` or `INFURA_PROJECT_ID` and `ETH_NETWORK` in your environment for better on-chain lookups.
