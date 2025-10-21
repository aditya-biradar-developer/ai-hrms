-- ============================================================================
-- Add Google OAuth Support to Users Table
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Add google_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Make password_hash nullable (OAuth users don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID (sub claim from Google)';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('google_id', 'password_hash')
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Google OAuth support added to users table!' AS message;
