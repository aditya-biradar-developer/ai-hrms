-- Migration: Add Check-In/Check-Out System
-- Industry standard attendance tracking like Workday, BambooHR, SAP

-- 1. Add check-in/check-out columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_time TIME,
ADD COLUMN IF NOT EXISTS check_out_time TIME,
ADD COLUMN IF NOT EXISTS work_hours DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_by_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create company_work_schedule table
CREATE TABLE IF NOT EXISTS company_work_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '18:00:00',
  late_grace_period_minutes INTEGER DEFAULT 15,
  full_day_hours DECIMAL(4,2) DEFAULT 8.0,
  half_day_hours DECIMAL(4,2) DEFAULT 4.0,
  working_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Insert default work schedule
INSERT INTO company_work_schedule (
  work_start_time,
  work_end_time,
  late_grace_period_minutes,
  full_day_hours,
  half_day_hours,
  working_days
) VALUES (
  '09:00:00',
  '18:00:00',
  15,
  8.0,
  4.0,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
) ON CONFLICT DO NOTHING;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_check_out ON attendance(check_out_time);
CREATE INDEX IF NOT EXISTS idx_attendance_is_late ON attendance(is_late);
CREATE INDEX IF NOT EXISTS idx_attendance_date_user ON attendance(date, user_id);

-- 5. Add comments
COMMENT ON COLUMN attendance.check_in_time IS 'Time when employee checked in';
COMMENT ON COLUMN attendance.check_out_time IS 'Time when employee checked out';
COMMENT ON COLUMN attendance.work_hours IS 'Total hours worked (check_out - check_in)';
COMMENT ON COLUMN attendance.is_late IS 'Whether employee was late';
COMMENT ON COLUMN attendance.late_by_minutes IS 'Minutes late after grace period';
COMMENT ON COLUMN attendance.overtime_minutes IS 'Extra minutes worked beyond schedule';
COMMENT ON TABLE company_work_schedule IS 'Company-wide work schedule and policies';

-- 6. Create function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours(
  check_in TIME,
  check_out TIME
) RETURNS DECIMAL(4,2) AS $$
BEGIN
  IF check_in IS NULL OR check_out IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to check if late
CREATE OR REPLACE FUNCTION is_employee_late(
  check_in_time TIME,
  work_start_time TIME,
  grace_period_minutes INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  IF check_in_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN check_in_time > (work_start_time + (grace_period_minutes || ' minutes')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-calculate work hours and late status
CREATE OR REPLACE FUNCTION update_attendance_calculations()
RETURNS TRIGGER AS $$
DECLARE
  schedule RECORD;
BEGIN
  -- Get work schedule
  SELECT * INTO schedule FROM company_work_schedule LIMIT 1;
  
  -- Calculate work hours if both check-in and check-out exist
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.work_hours := calculate_work_hours(NEW.check_in_time, NEW.check_out_time);
    
    -- Calculate overtime
    IF NEW.work_hours > schedule.full_day_hours THEN
      NEW.overtime_minutes := ROUND((NEW.work_hours - schedule.full_day_hours) * 60);
    END IF;
  END IF;
  
  -- Check if late
  IF NEW.check_in_time IS NOT NULL THEN
    NEW.is_late := is_employee_late(
      NEW.check_in_time,
      schedule.work_start_time,
      schedule.late_grace_period_minutes
    );
    
    -- Calculate late minutes
    IF NEW.is_late THEN
      NEW.late_by_minutes := EXTRACT(EPOCH FROM (
        NEW.check_in_time - (schedule.work_start_time + (schedule.late_grace_period_minutes || ' minutes')::INTERVAL)
      )) / 60;
    ELSE
      NEW.late_by_minutes := 0;
    END IF;
  END IF;
  
  -- Auto-set status based on check-in
  IF NEW.check_in_time IS NOT NULL AND NEW.status IS NULL THEN
    IF NEW.is_late THEN
      NEW.status := 'late';
    ELSE
      NEW.status := 'present';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_attendance_calculations ON attendance;
CREATE TRIGGER trigger_update_attendance_calculations
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_calculations();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Check-In/Check-Out system installed successfully!';
  RAISE NOTICE '📋 Features added:';
  RAISE NOTICE '   • Check-in/Check-out time tracking';
  RAISE NOTICE '   • Automatic late detection (15 min grace period)';
  RAISE NOTICE '   • Work hours calculation';
  RAISE NOTICE '   • Overtime tracking';
  RAISE NOTICE '   • Configurable work schedule';
END $$;
