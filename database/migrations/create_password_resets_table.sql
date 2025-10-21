-- ============================================================================
-- Password Resets Table Migration
-- ============================================================================
-- This table stores password reset verification codes
-- Codes expire after 10 minutes and can only be used once

-- Create password_resets table
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

-- Create policy to allow public access (needed for password reset functionality)
CREATE POLICY "Allow public access for password resets" ON password_resets
  FOR ALL USING (true);

-- Add comment to table
COMMENT ON TABLE password_resets IS 'Stores password reset verification codes with 10-minute expiry';
COMMENT ON COLUMN password_resets.email IS 'Email address of the user requesting password reset';
COMMENT ON COLUMN password_resets.code IS '6-digit verification code sent to user email';
COMMENT ON COLUMN password_resets.expires_at IS 'Timestamp when the code expires (10 minutes from creation)';
COMMENT ON COLUMN password_resets.used IS 'Flag indicating if the code has been used';
COMMENT ON COLUMN password_resets.created_at IS 'Timestamp when the reset request was created';
