-- Add onboarding columns to applications table if they don't exist

-- Add onboarding_token column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS onboarding_token TEXT;

-- Add onboarding_token_expires column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS onboarding_token_expires TIMESTAMP WITH TIME ZONE;

-- Add onboarding_completed column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding_completed_at column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add employee_id column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Add start_date column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Create index on onboarding_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_onboarding_token 
ON applications(onboarding_token) 
WHERE onboarding_token IS NOT NULL;

SELECT 'Onboarding columns added successfully!' AS message;
