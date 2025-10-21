-- Update Performance Table with Comprehensive Review Fields
-- Run this in Supabase SQL Editor

-- First, make old columns nullable (if they exist)
ALTER TABLE performance 
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE performance 
  ALTER COLUMN review_date DROP NOT NULL;

-- Add new columns to performance table
ALTER TABLE performance 
  -- Review Period (if not exists)
  ADD COLUMN IF NOT EXISTS review_period_start DATE,
  ADD COLUMN IF NOT EXISTS review_period_end DATE,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id),
  
  -- Core Metrics (1-5 rating scale)
  ADD COLUMN IF NOT EXISTS quality_of_work INTEGER CHECK (quality_of_work BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS productivity INTEGER CHECK (productivity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication INTEGER CHECK (communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS teamwork INTEGER CHECK (teamwork BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS problem_solving INTEGER CHECK (problem_solving BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS initiative INTEGER CHECK (initiative BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS attendance_punctuality INTEGER CHECK (attendance_punctuality BETWEEN 1 AND 5),
  
  -- Goal Tracking
  ADD COLUMN IF NOT EXISTS previous_goals_completion TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  
  -- Performance Feedback
  ADD COLUMN IF NOT EXISTS achievements TEXT,
  ADD COLUMN IF NOT EXISTS areas_of_improvement TEXT,
  ADD COLUMN IF NOT EXISTS manager_comments TEXT,
  ADD COLUMN IF NOT EXISTS employee_self_assessment TEXT,
  
  -- Final Evaluation
  ADD COLUMN IF NOT EXISTS overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS recommendation VARCHAR(50) CHECK (recommendation IN ('none', 'promotion', 'bonus', 'training', 'pip')),
  
  -- Status column
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'completed'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_user_period ON performance(user_id, review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_performance_reviewer ON performance(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_status ON performance(status);
CREATE INDEX IF NOT EXISTS idx_performance_overall_rating ON performance(overall_rating);

-- Add comment to table
COMMENT ON TABLE performance IS 'Comprehensive employee performance reviews with metrics, goals, and recommendations';

-- Add comments to columns
COMMENT ON COLUMN performance.quality_of_work IS 'Rating 1-5 for quality of work delivered';
COMMENT ON COLUMN performance.productivity IS 'Rating 1-5 for productivity and efficiency';
COMMENT ON COLUMN performance.communication IS 'Rating 1-5 for communication skills';
COMMENT ON COLUMN performance.teamwork IS 'Rating 1-5 for team collaboration';
COMMENT ON COLUMN performance.problem_solving IS 'Rating 1-5 for problem-solving ability';
COMMENT ON COLUMN performance.initiative IS 'Rating 1-5 for initiative and ownership';
COMMENT ON COLUMN performance.attendance_punctuality IS 'Rating 1-5 for attendance and punctuality';
COMMENT ON COLUMN performance.overall_rating IS 'Overall performance rating 1-5 (weighted average or manager decision)';
COMMENT ON COLUMN performance.recommendation IS 'HR recommendation: promotion, bonus, training, pip, or none';
COMMENT ON COLUMN performance.status IS 'Review status: draft, submitted, or completed';

-- Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'performance'
ORDER BY ordinal_position;
