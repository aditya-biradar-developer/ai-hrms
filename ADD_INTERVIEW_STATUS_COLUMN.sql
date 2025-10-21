-- Add interview_status column to applications table
-- This tracks if the AI interview has been completed

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS interview_status VARCHAR(20) DEFAULT 'pending';

-- Possible values: 'pending', 'in_progress', 'completed'

-- Add interview_completed_at timestamp
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS interview_completed_at TIMESTAMP;

-- Update existing records to have default status
UPDATE applications 
SET interview_status = 'pending' 
WHERE interview_status IS NULL;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name IN ('interview_status', 'interview_completed_at');

-- ✅ Done! Now we can track interview completion
