-- ============================================================================
-- Clear Attendance Records for Testing
-- ============================================================================
-- Run this in Supabase SQL Editor to reset attendance for testing

-- OPTION 1: Delete ALL attendance records (complete fresh start)
-- Uncomment the line below to delete all attendance
-- DELETE FROM attendance;

-- OPTION 2: Delete attendance for specific user (recommended for testing)
-- Replace 'YOUR_USER_ID' with actual user ID
-- DELETE FROM attendance WHERE user_id = 'YOUR_USER_ID';

-- OPTION 3: Delete attendance for today only (safest option)
DELETE FROM attendance WHERE date = CURRENT_DATE;

-- OPTION 4: Delete attendance for specific date range
-- DELETE FROM attendance WHERE date BETWEEN '2025-10-01' AND '2025-10-16';

-- OPTION 5: Delete only face recognition attendance (keep manual entries)
-- DELETE FROM attendance WHERE auto_marked = true;

-- Clear face encodings if you want to re-register faces
-- Uncomment the line below to clear all face registrations
-- UPDATE users SET face_encoding = NULL;

-- Clear face encoding for specific user
-- UPDATE users SET face_encoding = NULL WHERE id = 'YOUR_USER_ID';

-- Verify deletion
SELECT 'Attendance records cleared!' AS message;
SELECT COUNT(*) as remaining_records FROM attendance;

-- Check if face encodings are cleared
SELECT COUNT(*) as users_with_faces FROM users WHERE face_encoding IS NOT NULL;
