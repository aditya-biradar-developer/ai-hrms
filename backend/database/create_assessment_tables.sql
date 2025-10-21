-- Create separate tables for each assessment type to avoid conflicts

-- 1. Aptitude Assessment Questions Table
CREATE TABLE IF NOT EXISTS aptitude_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- {"A": "option1", "B": "option2", ...}
    correct_answer VARCHAR(1) NOT NULL,
    explanation TEXT,
    topic VARCHAR(100), -- logical_reasoning, quantitative_aptitude, verbal_ability, technical_aptitude
    difficulty VARCHAR(20) DEFAULT 'medium',
    time_limit INTEGER DEFAULT 60, -- seconds
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Communication Assessment Questions Table
CREATE TABLE IF NOT EXISTS communication_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- reading, listening, grammar
    section VARCHAR(50) NOT NULL, -- Reading, Listening, Grammar
    passage TEXT, -- For reading comprehension
    audio_url TEXT, -- For listening exercises
    instructions TEXT,
    options JSONB, -- For grammar questions
    correct_answer VARCHAR(10), -- For grammar questions
    evaluation_criteria JSONB, -- For speaking/writing tasks
    time_limit INTEGER DEFAULT 120, -- seconds
    question_order INTEGER DEFAULT 0,
    title TEXT, -- Question title
    skill VARCHAR(50), -- reading, listening, grammar
    subtype VARCHAR(50), -- sentence, passage, etc.
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Coding Assessment Questions Table
CREATE TABLE IF NOT EXISTS coding_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    code_template TEXT,
    test_cases JSONB NOT NULL, -- [{"input": "...", "expected_output": "..."}]
    difficulty VARCHAR(20) DEFAULT 'medium',
    programming_language VARCHAR(50) DEFAULT 'javascript',
    time_limit INTEGER DEFAULT 1800, -- 30 minutes in seconds
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Assessment Results Table (Multi-Round Storage)
CREATE TABLE IF NOT EXISTS assessment_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) NOT NULL, -- aptitude, communication, coding
    overall_score INTEGER NOT NULL,
    total_questions INTEGER,
    correct_answers INTEGER,
    time_taken INTEGER, -- seconds
    sections_scores JSONB, -- {"reading": {"score": 85, "completed": 3, "total": 3}}
    answers JSONB NOT NULL, -- Store all answers
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(application_id, assessment_type) -- Prevent duplicate assessments of same type
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_aptitude_questions_application_id ON aptitude_questions(application_id);
CREATE INDEX IF NOT EXISTS idx_communication_questions_application_id ON communication_questions(application_id);
CREATE INDEX IF NOT EXISTS idx_coding_questions_application_id ON coding_questions(application_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_application_id ON assessment_results(application_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_type ON assessment_results(assessment_type);

-- Add comments for documentation
COMMENT ON TABLE aptitude_questions IS 'Stores aptitude assessment questions (MCQ format)';
COMMENT ON TABLE communication_questions IS 'Stores communication assessment questions (reading, listening, grammar)';
COMMENT ON TABLE coding_questions IS 'Stores coding challenge questions with test cases';
COMMENT ON TABLE assessment_results IS 'Stores results from all assessment types in multi-round format';
