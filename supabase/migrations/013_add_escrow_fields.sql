-- 013_add_escrow_fields.sql
-- Tracks which on-chain escrow contract was used for each fee and
-- what the derived bytes32 auditId key is for querying on-chain state.

ALTER TABLE public.audit_fees
  ADD COLUMN IF NOT EXISTS escrow_contract_address text,   -- deployed BugBountyEscrow address
  ADD COLUMN IF NOT EXISTS escrow_audit_id          text;  -- bytes32 hex key used on-chain (keccak256 of fee row id)

-- Index for contract-address lookups during reconciliation
CREATE INDEX IF NOT EXISTS idx_audit_fees_escrow_contract
  ON public.audit_fees (escrow_contract_address)
  WHERE escrow_contract_address IS NOT NULL;
