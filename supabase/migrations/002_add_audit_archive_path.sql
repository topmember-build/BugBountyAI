-- Add upload metadata to audits so uploaded archives can be attached to an audit

ALTER TABLE IF EXISTS public.audits
ADD COLUMN IF NOT EXISTS archive_path text;

ALTER TABLE IF EXISTS public.audits
ADD COLUMN IF NOT EXISTS archive_filename text;

ALTER TABLE IF EXISTS public.audits
ADD COLUMN IF NOT EXISTS archive_uploaded_at timestamptz;
