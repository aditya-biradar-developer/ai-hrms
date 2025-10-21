-- Add answer_mode and code_language columns to interview_questions table
-- Run this SQL in your Supabase SQL Editor

-- Add answer_mode column (for write/voice mode)
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS answer_mode VARCHAR(10) DEFAULT 'voice';

-- Add code_language column (for code snippet language)
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS code_language VARCHAR(20) DEFAULT 'javascript';

-- Update existing records to have default values
UPDATE interview_questions 
SET answer_mode = 'voice' 
WHERE answer_mode IS NULL;

UPDATE interview_questions 
SET code_language = 'javascript' 
WHERE code_language IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'interview_questions' 
AND column_name IN ('answer_mode', 'code_language');

-- ✅ Done! Now custom questions will support:
-- 1. Write mode (type answers) vs Voice mode (speak answers)
-- 2. Code language specification for syntax highlighting
