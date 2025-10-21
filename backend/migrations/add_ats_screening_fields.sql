-- Migration: Add ATS Screening Fields to Applications
-- Store AI screening results permanently

-- Add ATS screening columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS ats_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ats_recommendation VARCHAR(50),
ADD COLUMN IF NOT EXISTS ats_analysis TEXT,
ADD COLUMN IF NOT EXISTS ats_strengths TEXT,
ADD COLUMN IF NOT EXISTS ats_weaknesses TEXT,
ADD COLUMN IF NOT EXISTS ats_matched_skills TEXT[],
ADD COLUMN IF NOT EXISTS ats_missing_skills TEXT[],
ADD COLUMN IF NOT EXISTS ats_screened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ats_screened_by UUID REFERENCES users(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_ats_score ON applications(ats_score DESC);
CREATE INDEX IF NOT EXISTS idx_applications_ats_recommendation ON applications(ats_recommendation);

-- Add comments
COMMENT ON COLUMN applications.ats_score IS 'AI/ATS match score (0-100)';
COMMENT ON COLUMN applications.ats_recommendation IS 'AI recommendation: Strong Match, Good Match, Partial Match, Not Recommended';
COMMENT ON COLUMN applications.ats_analysis IS 'AI analysis summary';
COMMENT ON COLUMN applications.ats_strengths IS 'Candidate strengths identified by AI';
COMMENT ON COLUMN applications.ats_weaknesses IS 'Areas for improvement identified by AI';
COMMENT ON COLUMN applications.ats_matched_skills IS 'Skills that matched job requirements';
COMMENT ON COLUMN applications.ats_missing_skills IS 'Skills missing from candidate profile';
COMMENT ON COLUMN applications.ats_screened_at IS 'When the ATS screening was performed';
COMMENT ON COLUMN applications.ats_screened_by IS 'HR user who ran the screening';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ATS screening fields added successfully!';
  RAISE NOTICE '📋 Applications can now store AI screening results permanently';
END $$;
