-- Add missing columns to communication_questions table
-- This migration adds fields that are required by the AssessmentService

-- Add title column
ALTER TABLE communication_questions 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add skill column  
ALTER TABLE communication_questions 
ADD COLUMN IF NOT EXISTS skill VARCHAR(50);

-- Add subtype column
ALTER TABLE communication_questions 
ADD COLUMN IF NOT EXISTS subtype VARCHAR(50);

-- Add difficulty column
ALTER TABLE communication_questions 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';

-- Add comments for new columns
COMMENT ON COLUMN communication_questions.title IS 'Question title or heading';
COMMENT ON COLUMN communication_questions.skill IS 'Communication skill: reading, listening, grammar';
COMMENT ON COLUMN communication_questions.subtype IS 'Question subtype: sentence, passage, etc.';
COMMENT ON COLUMN communication_questions.difficulty IS 'Question difficulty: easy, medium, hard';
