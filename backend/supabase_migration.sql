-- =====================================================
-- COMMUNICATION ASSESSMENT TABLE SETUP
-- Safe to run - Only affects communication assessments
-- =====================================================

-- 1. Create communication_questions table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS communication_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- reading, listening, grammar
    section VARCHAR(50) NOT NULL, -- Reading, Listening, Grammar
    passage TEXT, -- For reading comprehension passages
    audio_url TEXT, -- For listening exercises
    instructions TEXT, -- Question instructions
    options JSONB, -- For grammar MCQ questions
    correct_answer VARCHAR(10), -- For grammar questions
    evaluation_criteria JSONB, -- For speaking/writing evaluation
    time_limit INTEGER DEFAULT 120, -- seconds
    question_order INTEGER DEFAULT 0,
    title TEXT, -- Question title
    skill VARCHAR(50), -- reading, listening, grammar
    subtype VARCHAR(50), -- sentence, passage, etc.
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns (if table already exists but missing columns)
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS skill VARCHAR(50);
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS subtype VARCHAR(50);
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';

-- 3. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_communication_questions_application_id 
ON communication_questions(application_id);

-- 4. Add helpful comments
COMMENT ON TABLE communication_questions IS 'Stores communication assessment questions (reading, listening, grammar)';
COMMENT ON COLUMN communication_questions.passage IS 'Reading passage content for reading aloud questions';
COMMENT ON COLUMN communication_questions.audio_url IS 'Audio content for listening exercises';
COMMENT ON COLUMN communication_questions.title IS 'Question title or heading';
COMMENT ON COLUMN communication_questions.skill IS 'Communication skill: reading, listening, grammar';
COMMENT ON COLUMN communication_questions.subtype IS 'Question subtype: sentence, passage, etc.';
COMMENT ON COLUMN communication_questions.difficulty IS 'Question difficulty: easy, medium, hard';

-- =====================================================
-- VERIFICATION QUERY (Optional - run to test)
-- =====================================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'communication_questions'
-- ORDER BY ordinal_position;
