-- Create interview_questions table for custom questions by recruitment team

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- Question details
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'general', -- general, technical, behavioral, coding
  expected_answer TEXT, -- Optional: What HR expects as answer
  code_snippet TEXT, -- Optional: Code to display with question
  code_language VARCHAR(20), -- javascript, python, java, etc.
  duration INTEGER DEFAULT 180, -- Time in seconds (3 minutes default)
  
  -- Order and metadata
  question_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  
  -- PDF Source (optional)
  pdf_source_url TEXT, -- URL of uploaded PDF containing questions
  extracted_from_pdf BOOLEAN DEFAULT FALSE, -- Whether question was extracted from PDF
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_job 
ON interview_questions(job_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_application 
ON interview_questions(application_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_order 
ON interview_questions(question_order);

-- Enable RLS
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and HR can manage questions
CREATE POLICY "Admins and HR can manage questions" 
ON interview_questions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- Policy: Candidates can view questions during their interview (read-only)
CREATE POLICY "Candidates can view their interview questions" 
ON interview_questions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM applications 
    WHERE id = interview_questions.application_id 
    AND candidate_id = auth.uid()
  )
);

-- Comments
COMMENT ON TABLE interview_questions IS 'Custom interview questions created by recruitment team';
COMMENT ON COLUMN interview_questions.question_text IS 'The actual question to ask';
COMMENT ON COLUMN interview_questions.expected_answer IS 'What HR expects as answer (for evaluation reference)';
COMMENT ON COLUMN interview_questions.code_snippet IS 'Code to display with the question';
COMMENT ON COLUMN interview_questions.duration IS 'Time allocated for this question in seconds';
