-- Add columns for soft delete functionality
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Update jobs status enum to include 'deleted'
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
ADD CONSTRAINT jobs_status_check
CHECK (status IN ('open', 'closed', 'on_hold', 'deleted'));