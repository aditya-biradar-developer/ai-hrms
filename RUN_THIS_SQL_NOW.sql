-- ⚠️ IMPORTANT: Run this SQL in Supabase NOW!
-- This adds the missing columns for write mode to work

-- Add answer_mode column
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS answer_mode VARCHAR(10) DEFAULT 'voice';

-- Add code_language column
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS code_language VARCHAR(20) DEFAULT 'javascript';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'interview_questions' 
AND column_name IN ('answer_mode', 'code_language', 'code_snippet', 'expected_answer');

-- ✅ After running this, refresh your frontend and create new questions
