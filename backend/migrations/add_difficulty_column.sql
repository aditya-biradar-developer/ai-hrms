-- Add difficulty column to interview_questions table
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'intermediate';

-- Add comment
COMMENT ON COLUMN interview_questions.difficulty IS 'Question difficulty level: easy, intermediate, advanced';

-- Create index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_interview_questions_difficulty 
ON interview_questions(difficulty);
