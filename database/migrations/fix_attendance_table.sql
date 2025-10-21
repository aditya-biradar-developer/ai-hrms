-- ============================================================================
-- Fix Attendance Table - Add Missing Columns
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Add missing columns to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in TIME;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out TIME;

-- Add face recognition fields (if not already added)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recognition_confidence DECIMAL(5,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_image_url TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS auto_marked BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN attendance.check_in IS 'Time when employee checked in';
COMMENT ON COLUMN attendance.check_out IS 'Time when employee checked out';
COMMENT ON COLUMN attendance.recognition_confidence IS 'Face recognition confidence score (0-100)';
COMMENT ON COLUMN attendance.face_image_url IS 'URL of the captured face image';
COMMENT ON COLUMN attendance.auto_marked IS 'Whether attendance was auto-marked by face recognition';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_attendance_auto_marked ON attendance(auto_marked);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendance' 
AND column_name IN ('check_in', 'check_out', 'recognition_confidence', 'face_image_url', 'auto_marked')
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Attendance table fixed! Missing columns added.' AS message;
