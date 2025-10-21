-- ============================================================================
-- Clear All Face Data for Fresh Testing
-- ============================================================================
-- Run this in Supabase SQL Editor to reset face recognition data

-- Clear all face encodings from users table
UPDATE users SET face_encoding = NULL;

-- Verify all face encodings are cleared
SELECT 
    id,
    name,
    email,
    CASE 
        WHEN face_encoding IS NULL THEN '❌ No face registered'
        ELSE '✅ Face registered'
    END as face_status
FROM users
ORDER BY name;

-- Count users with/without faces
SELECT 
    COUNT(*) FILTER (WHERE face_encoding IS NOT NULL) as users_with_faces,
    COUNT(*) FILTER (WHERE face_encoding IS NULL) as users_without_faces,
    COUNT(*) as total_users
FROM users;

-- Success message
SELECT '✅ All face data cleared! Ready for fresh testing.' AS message;
