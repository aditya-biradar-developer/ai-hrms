-- ============================================================================
-- Shift Management and Working Days Calendar
-- ============================================================================
-- Run this in Supabase SQL Editor

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_threshold_minutes INTEGER DEFAULT 15,
  early_checkout_threshold_minutes INTEGER DEFAULT 15,
  working_days JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_shifts table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, shift_id, effective_from)
);

-- Create working_days_calendar table
CREATE TABLE IF NOT EXISTS working_days_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  is_working_day BOOLEAN DEFAULT true,
  is_holiday BOOLEAN DEFAULT false,
  holiday_name VARCHAR(255),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance_analytics table (for caching)
CREATE TABLE IF NOT EXISTS attendance_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(20) NOT NULL, -- 'day', 'week', 'month', 'year'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  attendance_percentage DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_start, period_end)
);

-- Insert default shifts
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes, working_days) VALUES
  ('General Shift (9 AM - 6 PM)', '09:00:00', '18:00:00', 15, '["Monday","Tuesday","Wednesday","Thursday","Friday"]'),
  ('Early Shift (6 AM - 3 PM)', '06:00:00', '15:00:00', 15, '["Monday","Tuesday","Wednesday","Thursday","Friday"]'),
  ('Late Shift (2 PM - 11 PM)', '14:00:00', '23:00:00', 15, '["Monday","Tuesday","Wednesday","Thursday","Friday"]'),
  ('Night Shift (10 PM - 7 AM)', '22:00:00', '07:00:00', 15, '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'),
  ('Flexible Shift', '10:00:00', '19:00:00', 30, '["Monday","Tuesday","Wednesday","Thursday","Friday"]')
ON CONFLICT DO NOTHING;

-- Function to generate working days for a year
CREATE OR REPLACE FUNCTION generate_working_days(year_param INTEGER)
RETURNS void AS $$
DECLARE
  v_current_date DATE;
  v_end_date DATE;
  v_day_name VARCHAR(20);
  v_week_num INTEGER;
BEGIN
  v_current_date := (year_param || '-01-01')::DATE;
  v_end_date := (year_param || '-12-31')::DATE;
  
  WHILE v_current_date <= v_end_date LOOP
    v_day_name := TO_CHAR(v_current_date, 'Day');
    v_week_num := EXTRACT(WEEK FROM v_current_date)::INTEGER;
    
    INSERT INTO working_days_calendar (
      date, 
      is_working_day, 
      is_holiday,
      year, 
      month, 
      week_number, 
      day_of_week
    ) VALUES (
      v_current_date,
      CASE WHEN TRIM(v_day_name) IN ('Saturday', 'Sunday') THEN false ELSE true END,
      false,
      year_param,
      EXTRACT(MONTH FROM v_current_date)::INTEGER,
      v_week_num,
      TRIM(v_day_name)
    )
    ON CONFLICT (date) DO NOTHING;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate working days for 2024 and 2025
SELECT generate_working_days(2024);
SELECT generate_working_days(2025);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_shifts_user_id ON user_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shifts_shift_id ON user_shifts(shift_id);
CREATE INDEX IF NOT EXISTS idx_user_shifts_effective_from ON user_shifts(effective_from);
CREATE INDEX IF NOT EXISTS idx_working_days_date ON working_days_calendar(date);
CREATE INDEX IF NOT EXISTS idx_working_days_year_month ON working_days_calendar(year, month);
CREATE INDEX IF NOT EXISTS idx_attendance_analytics_user_period ON attendance_analytics(user_id, period_type, period_start);

-- Add comments
COMMENT ON TABLE shifts IS 'Shift timings and configurations';
COMMENT ON TABLE user_shifts IS 'User-shift assignments with effective dates';
COMMENT ON TABLE working_days_calendar IS 'Calendar of working days and holidays';
COMMENT ON TABLE attendance_analytics IS 'Pre-calculated attendance statistics';

-- Function to calculate attendance percentage
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_working_days INTEGER,
  present_days INTEGER,
  late_days INTEGER,
  absent_days INTEGER,
  leave_days INTEGER,
  attendance_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH working_days AS (
    SELECT COUNT(*) as total
    FROM working_days_calendar
    WHERE date BETWEEN p_start_date AND p_end_date
    AND is_working_day = true
    AND is_holiday = false
  ),
  attendance_summary AS (
    SELECT 
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_count
    FROM attendance
    WHERE user_id = p_user_id
    AND date BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    wd.total::INTEGER,
    COALESCE(ats.present, 0)::INTEGER,
    COALESCE(ats.late, 0)::INTEGER,
    (wd.total - COALESCE(ats.present, 0) - COALESCE(ats.late, 0) - COALESCE(ats.leave_count, 0))::INTEGER as absent,
    COALESCE(ats.leave_count, 0)::INTEGER,
    CASE 
      WHEN wd.total > 0 THEN 
        ROUND(((COALESCE(ats.present, 0) + COALESCE(ats.late, 0))::DECIMAL / wd.total::DECIMAL * 100), 2)
      ELSE 0 
    END as percentage
  FROM working_days wd
  CROSS JOIN attendance_summary ats;
END;
$$ LANGUAGE plpgsql;

-- Verify
SELECT '✅ Shift management and working days calendar created!' AS message;
SELECT 'Total working days in 2025:', COUNT(*) FROM working_days_calendar WHERE year = 2025 AND is_working_day = true;
SELECT 'Total shifts created:', COUNT(*) FROM shifts;
