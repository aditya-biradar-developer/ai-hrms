-- Add question_scores column to interview_results table
-- This stores individual question evaluations with answers and scores

ALTER TABLE interview_results 
ADD COLUMN IF NOT EXISTS question_scores JSONB DEFAULT '[]';

-- Add comment
COMMENT ON COLUMN interview_results.question_scores IS 'Individual question scores with answers and feedback (JSON array)';

-- Add index for better query performance on JSONB
CREATE INDEX IF NOT EXISTS idx_interview_results_question_scores 
ON interview_results USING GIN (question_scores);

-- Example structure:
-- question_scores: [
--   {
--     "question": "What is the difference between id and class in HTML?",
--     "answer": "The id attribute is unique...",
--     "score": 85,
--     "max_score": 100,
--     "feedback": "Excellent answer! Shows clear understanding..."
--   },
--   {
--     "question": "Next question...",
--     "answer": "Candidate's response...",
--     "score": 72,
--     "max_score": 100,
--     "feedback": "Good understanding, could add more detail..."
--   }
-- ]
