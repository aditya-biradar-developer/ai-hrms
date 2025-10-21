-- Bulk Mark Attendance as Present
-- From: 2025-01-01 to 2025-10-17
-- For: All employees (excluding admin role)

-- This script will create attendance records for all working days
-- Status: Present for all employees

DO $$
DECLARE
  attendance_date DATE := '2025-01-01';
  end_date DATE := '2025-10-17';
  user_record RECORD;
  day_of_week INTEGER;
BEGIN
  -- Loop through each date
  WHILE attendance_date <= end_date LOOP
    -- Get day of week (0 = Sunday, 6 = Saturday)
    day_of_week := EXTRACT(DOW FROM attendance_date);
    
    -- Only mark attendance for weekdays (Monday-Friday)
    -- Skip weekends: 0 = Sunday, 6 = Saturday
    IF day_of_week NOT IN (0, 6) THEN
      
      -- Loop through all users (except admin)
      FOR user_record IN 
        SELECT id FROM users 
        WHERE role != 'admin' 
        AND role != 'candidate'
      LOOP
        -- Insert attendance record if it doesn't exist
        INSERT INTO attendance (user_id, date, status, check_in_time, check_out_time, work_hours)
        VALUES (
          user_record.id,
          attendance_date,
          'present',
          '09:00:00',  -- Default check-in time
          '18:00:00',  -- Default check-out time
          8.0          -- 8 hours worked
        )
        ON CONFLICT (user_id, date) DO NOTHING; -- Skip if already exists
        
      END LOOP;
      
    END IF;
    
    -- Move to next day
    attendance_date := attendance_date + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE '✅ Bulk attendance marking completed!';
  RAISE NOTICE '📅 Period: 2025-01-01 to 2025-10-17';
  RAISE NOTICE '👥 Marked for: All employees (excluding admin and candidates)';
  RAISE NOTICE '📊 Only weekdays (Mon-Fri) were marked';
END $$;

-- Verify the results
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(date) as first_date,
  MAX(date) as last_date
FROM attendance
WHERE date BETWEEN '2025-01-01' AND '2025-10-17'
AND status = 'present';
