-- ============================================================================
-- Add Face Recognition Support
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Add face encoding and shift timing fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_encoding TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_start_time TIME DEFAULT '09:00:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_end_time TIME DEFAULT '18:00:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;

-- Add face recognition fields to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recognition_confidence DECIMAL(5,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS face_image_url TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS auto_marked BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN users.face_encoding IS 'Encoded face data for recognition (stored as JSON string)';
COMMENT ON COLUMN users.shift_start_time IS 'Employee shift start time';
COMMENT ON COLUMN users.shift_end_time IS 'Employee shift end time';
COMMENT ON COLUMN users.late_threshold_minutes IS 'Minutes after shift start to mark as late';
COMMENT ON COLUMN attendance.recognition_confidence IS 'Face recognition confidence score (0-100)';
COMMENT ON COLUMN attendance.face_image_url IS 'URL of the captured face image';
COMMENT ON COLUMN attendance.auto_marked IS 'Whether attendance was auto-marked by face recognition';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_face_encoding ON users(face_encoding) WHERE face_encoding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_auto_marked ON attendance(auto_marked);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name IN ('face_encoding', 'shift_start_time', 'shift_end_time', 'late_threshold_minutes')
ORDER BY ordinal_position;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'attendance' 
AND column_name IN ('recognition_confidence', 'face_image_url', 'auto_marked')
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Face recognition fields added successfully!' AS message;
