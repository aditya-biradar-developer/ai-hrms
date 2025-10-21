-- ============================================================================
-- CRITICAL: Run these SQL migrations in your Supabase SQL Editor
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"

-- ============================================================================
-- 1. CREATE PASSWORD_RESETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- Enable Row Level Security
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public access for password resets" ON password_resets;

-- Create policy to allow public access (needed for password reset)
CREATE POLICY "Allow public access for password resets" ON password_resets
  FOR ALL USING (true);

COMMENT ON TABLE password_resets IS 'Stores password reset verification codes with 10-minute expiry';

-- ============================================================================
-- 2. ADD CATEGORY COLUMN TO NOTIFICATIONS TABLE
-- ============================================================================

-- Check if category column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category VARCHAR(50);
    
    -- Set default category for existing notifications
    UPDATE notifications SET category = 'general' WHERE category IS NULL;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
    
    COMMENT ON COLUMN notifications.category IS 'Category: users, payroll, performance, leaves, attendance, applications';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify password_resets table was created
SELECT 'password_resets table' AS table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_resets') 
       THEN '✅ EXISTS' 
       ELSE '❌ NOT FOUND' 
       END AS status;

-- Verify notifications.category column was added
SELECT 'notifications.category column' AS column_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category')
       THEN '✅ EXISTS'
       ELSE '❌ NOT FOUND'
       END AS status;

-- Show password_resets table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'password_resets'
ORDER BY ordinal_position;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🎉 All migrations completed successfully! Restart your backend server.' AS message;
