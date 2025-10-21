-- ============================================================================
-- Add Interview Fields to Applications Table
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Add interview fields to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_time VARCHAR(50);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_location VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_notes TEXT;

-- Add comments
COMMENT ON COLUMN applications.interview_date IS 'Scheduled interview date and time';
COMMENT ON COLUMN applications.interview_time IS 'Interview time (e.g., 10:00 AM - 11:00 AM)';
COMMENT ON COLUMN applications.interview_location IS 'Interview location (office address, video call link, etc.)';
COMMENT ON COLUMN applications.interview_notes IS 'Additional notes about the interview';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_interview_date ON applications(interview_date);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'applications' 
AND column_name IN ('interview_date', 'interview_time', 'interview_location', 'interview_notes')
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Interview fields added to applications table!' AS message;
