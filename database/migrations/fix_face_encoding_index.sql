-- ============================================================================
-- Fix Face Encoding Index Issue
-- ============================================================================
-- The face encoding is too large to be indexed directly
-- Remove the index and optionally add a hash-based index

-- Drop the problematic index
DROP INDEX IF EXISTS idx_users_face_encoding;

-- Optional: Create a hash-based index for faster lookups (if needed)
-- This creates an index on the MD5 hash of the face_encoding
-- CREATE INDEX idx_users_face_encoding_hash ON users (MD5(face_encoding));

-- Verify the index is removed
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%face%';

-- Success message
SELECT '✅ Face encoding index removed successfully!' AS message;
