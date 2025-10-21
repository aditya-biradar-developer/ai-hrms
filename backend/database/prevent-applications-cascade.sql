-- First drop the existing foreign key constraint
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;

-- Then add it back without CASCADE DELETE
ALTER TABLE applications
ADD CONSTRAINT applications_job_id_fkey
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE RESTRICT;