-- Create interview_results table to store AI interview scores and feedback

CREATE TABLE IF NOT EXISTS interview_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Scores
  overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  performance_level VARCHAR(50) NOT NULL DEFAULT 'Average',
  
  -- Detailed evaluation (stored as JSONB for flexibility)
  category_scores JSONB DEFAULT '[]',
  feedback TEXT,
  recommendations JSONB DEFAULT '[]',
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  
  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_results_application 
ON interview_results(application_id);

CREATE INDEX IF NOT EXISTS idx_interview_results_candidate 
ON interview_results(candidate_id);

CREATE INDEX IF NOT EXISTS idx_interview_results_job 
ON interview_results(job_id);

CREATE INDEX IF NOT EXISTS idx_interview_results_score 
ON interview_results(overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_interview_results_completed 
ON interview_results(completed_at DESC);

-- Add comments
COMMENT ON TABLE interview_results IS 'Stores AI interview evaluation results and scores';
COMMENT ON COLUMN interview_results.overall_score IS 'Overall interview score (0-100)';
COMMENT ON COLUMN interview_results.performance_level IS 'Performance level: Excellent, Good, Average, Poor';
COMMENT ON COLUMN interview_results.category_scores IS 'Scores by category (JSON array)';
COMMENT ON COLUMN interview_results.feedback IS 'AI-generated detailed feedback';
COMMENT ON COLUMN interview_results.recommendations IS 'Improvement recommendations (JSON array)';
COMMENT ON COLUMN interview_results.strengths IS 'Identified strengths (JSON array)';
COMMENT ON COLUMN interview_results.weaknesses IS 'Identified weaknesses (JSON array)';

-- Enable RLS (Row Level Security) if needed
ALTER TABLE interview_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own interview results
CREATE POLICY "Users can view own interview results" 
ON interview_results FOR SELECT 
USING (auth.uid() = candidate_id);

-- Policy: Admins and HR can view all interview results
CREATE POLICY "Admins and HR can view all interview results" 
ON interview_results FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- Policy: System can insert interview results (for AI service)
CREATE POLICY "System can insert interview results" 
ON interview_results FOR INSERT 
WITH CHECK (true);
