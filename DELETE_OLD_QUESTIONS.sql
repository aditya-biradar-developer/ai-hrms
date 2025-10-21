-- Delete old questions for application 375b2c51-646f-4f3b-8e5d-d34d36da7638
-- Run this in Supabase SQL Editor

DELETE FROM interview_questions 
WHERE application_id = '375b2c51-646f-4f3b-8e5d-d34d36da7638';

-- Verify deletion
SELECT COUNT(*) as remaining_questions 
FROM interview_questions 
WHERE application_id = '375b2c51-646f-4f3b-8e5d-d34d36da7638';
