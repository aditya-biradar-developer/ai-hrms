-- Add new fields to jobs table for enhanced job posting management

-- Add posted_date column (date when job was posted)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS posted_date DATE DEFAULT CURRENT_DATE;

-- Add last_date_to_apply column (deadline for applications)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS last_date_to_apply DATE;

-- Add vacancies column (number of positions available)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS vacancies INTEGER DEFAULT 1;

-- Add filled_positions column (number of positions filled)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS filled_positions INTEGER DEFAULT 0;

-- Add check constraint to ensure filled_positions doesn't exceed vacancies
ALTER TABLE jobs 
ADD CONSTRAINT check_filled_positions 
CHECK (filled_positions >= 0 AND filled_positions <= vacancies);

-- Add check constraint to ensure last_date_to_apply is after posted_date
ALTER TABLE jobs 
ADD CONSTRAINT check_application_dates 
CHECK (last_date_to_apply IS NULL OR last_date_to_apply >= posted_date);

-- Update existing jobs to have posted_date set to created_at date
UPDATE jobs 
SET posted_date = created_at::date 
WHERE posted_date IS NULL;

-- Create index on last_date_to_apply for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_last_date_to_apply ON jobs(last_date_to_apply);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

COMMENT ON COLUMN jobs.posted_date IS 'Date when the job was posted';
COMMENT ON COLUMN jobs.last_date_to_apply IS 'Last date for candidates to apply';
COMMENT ON COLUMN jobs.vacancies IS 'Total number of positions available';
COMMENT ON COLUMN jobs.filled_positions IS 'Number of positions that have been filled';
