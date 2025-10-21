-- ============================================================================
-- Add Late Minutes Column to Attendance Table
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Add column to store how many minutes late
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_by_minutes INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN attendance.late_by_minutes IS 'Number of minutes employee was late (0 if not late)';

-- Create index for queries
CREATE INDEX IF NOT EXISTS idx_attendance_late_minutes ON attendance(late_by_minutes) WHERE late_by_minutes > 0;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'attendance' 
AND column_name = 'late_by_minutes';

-- Success message
SELECT '✅ late_by_minutes column added to attendance table!' AS message;
