-- Check for existing Google OAuth users
-- Run this in Supabase SQL Editor

-- 1. Find all Google OAuth users
SELECT 
  id,
  name,
  email,
  role,
  department,
  google_id,
  created_at
FROM users 
WHERE google_id IS NOT NULL
ORDER BY created_at DESC;

-- 2. Find users with wrong role (should be candidate if signed up via public)
SELECT 
  id,
  name,
  email,
  role,
  department,
  google_id,
  created_at
FROM users 
WHERE google_id IS NOT NULL 
AND role != 'candidate'
ORDER BY created_at DESC;

-- 3. OPTIONAL: Fix existing Google OAuth users to be candidates
-- (Only run if you want to convert them)
-- UPDATE users 
-- SET role = 'candidate',
--     department = 'Candidate'
-- WHERE google_id IS NOT NULL 
-- AND role != 'candidate'
-- AND role != 'admin'; -- Keep admin accounts safe

-- 4. OPTIONAL: Delete all Google OAuth test accounts
-- (Only run if you want to clean up test data)
-- DELETE FROM users 
-- WHERE google_id IS NOT NULL 
-- AND email LIKE '%test%'; -- Adjust this filter as needed
