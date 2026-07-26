-- Migration 018: Add Prior Audit Disclosure fields to competitions table
-- Purpose: Require hosts to declare any previous audits upfront to prevent
-- retroactive "we already knew about that bug" claims during judging.
-- All disclosures are timestamped for tamper-proof accountability.

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS has_prior_audit boolean NOT NULL DEFAULT false;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prior_audit_source text;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prior_audit_findings text;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prior_audit_report_url text;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prior_audit_date text;

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prior_audit_acknowledged_at timestamptz DEFAULT now();
