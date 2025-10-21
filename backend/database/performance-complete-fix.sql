-- Complete Performance Review System - Database Setup
-- Run this in Supabase SQL Editor

-- Step 1: Make old columns nullable to avoid conflicts
DO $$ 
BEGIN
    -- Make rating nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performance' AND column_name = 'rating'
    ) THEN
        ALTER TABLE performance ALTER COLUMN rating DROP NOT NULL;
    END IF;
    
    -- Make review_date nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performance' AND column_name = 'review_date'
    ) THEN
        ALTER TABLE performance ALTER COLUMN review_date DROP NOT NULL;
    END IF;
    
    -- Make feedback nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performance' AND column_name = 'feedback'
    ) THEN
        ALTER TABLE performance ALTER COLUMN feedback DROP NOT NULL;
    END IF;
END $$;

-- Step 2: Add all new columns
ALTER TABLE performance 
  -- Review Period
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
  
  -- Status
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'completed'));

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_performance_user_period ON performance(user_id, review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_performance_reviewer ON performance(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_status ON performance(status);
CREATE INDEX IF NOT EXISTS idx_performance_overall_rating ON performance(overall_rating);
CREATE INDEX IF NOT EXISTS idx_performance_created_at ON performance(created_at DESC);

-- Step 4: Add helpful comments
COMMENT ON TABLE performance IS 'Comprehensive employee performance reviews with metrics, goals, and recommendations';
COMMENT ON COLUMN performance.quality_of_work IS 'Rating 1-5 for quality of work delivered';
COMMENT ON COLUMN performance.productivity IS 'Rating 1-5 for productivity and efficiency';
COMMENT ON COLUMN performance.communication IS 'Rating 1-5 for communication skills';
COMMENT ON COLUMN performance.teamwork IS 'Rating 1-5 for team collaboration';
COMMENT ON COLUMN performance.problem_solving IS 'Rating 1-5 for problem-solving ability';
COMMENT ON COLUMN performance.initiative IS 'Rating 1-5 for initiative and ownership';
COMMENT ON COLUMN performance.attendance_punctuality IS 'Rating 1-5 for attendance and punctuality';
COMMENT ON COLUMN performance.overall_rating IS 'Overall performance rating 1-5';
COMMENT ON COLUMN performance.recommendation IS 'HR recommendation: promotion, bonus, training, pip, or none';
COMMENT ON COLUMN performance.status IS 'Review status: draft, submitted, or completed';

-- Step 5: Verify the setup
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'performance'
ORDER BY ordinal_position;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Performance review system setup complete!';
    RAISE NOTICE '📊 All columns added successfully';
    RAISE NOTICE '🔍 Indexes created for optimal performance';
END $$;
