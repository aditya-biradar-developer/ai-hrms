-- Create interview_questions table (this is what the backend actually uses)
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'technical',
  difficulty VARCHAR(20) DEFAULT 'intermediate',
  duration INTEGER DEFAULT 180,
  code_snippet TEXT,
  code_language VARCHAR(20) DEFAULT 'javascript',
  expected_answer TEXT,
  answer_mode VARCHAR(20) DEFAULT 'voice',
  question_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_interview_questions_application_id ON interview_questions(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_order ON interview_questions(application_id, question_order);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON interview_questions TO your_app_user;
