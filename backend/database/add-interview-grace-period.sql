-- Add interview grace period column to applications table
-- This allows HR to set a time window for candidates to join interviews

DO $$ 
BEGIN
    -- Add interview_grace_period_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='applications' AND column_name='interview_grace_period_minutes') THEN
        ALTER TABLE applications ADD COLUMN interview_grace_period_minutes INTEGER DEFAULT 10;
        
        COMMENT ON COLUMN applications.interview_grace_period_minutes IS 
        'Grace period in minutes after scheduled start time for candidates to join interview';
    END IF;
END $$;
