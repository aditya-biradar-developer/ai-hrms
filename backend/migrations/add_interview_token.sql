-- Add interview_token column to applications table
-- This stores the unique secure token for interview links

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS interview_token VARCHAR(64) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_interview_token 
ON applications(interview_token);

-- Add comment
COMMENT ON COLUMN applications.interview_token IS 'Unique token for secure interview access link';
