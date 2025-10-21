-- Add Industry Standard Shifts
-- Common shift patterns used in various industries

-- Delete existing shifts if any (optional - comment out if you want to keep existing)
-- DELETE FROM shifts;

-- 1. General Shift (9 AM - 6 PM) - Most Common
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('General Shift', '09:00:00', '18:00:00', 15);

-- 2. Morning Shift (6 AM - 3 PM)
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Morning Shift', '06:00:00', '15:00:00', 10);

-- 3. Afternoon Shift (2 PM - 11 PM)
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Afternoon Shift', '14:00:00', '23:00:00', 10);

-- 4. Night Shift (10 PM - 7 AM)
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Night Shift', '22:00:00', '07:00:00', 10);

-- 5. Flexible Shift (10 AM - 7 PM) - Tech Companies
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Flexible Shift', '10:00:00', '19:00:00', 30);

-- 6. Early Morning Shift (5 AM - 2 PM) - Retail/Hospitality
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Early Morning Shift', '05:00:00', '14:00:00', 10);

-- 7. Split Shift (7 AM - 10 PM) - Hospitality
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Split Shift', '07:00:00', '22:00:00', 15);

-- 8. Weekend Shift (9 AM - 6 PM)
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Weekend Shift', '09:00:00', '18:00:00', 15);

-- 9. Rotational Shift (8 AM - 8 PM) - 12 Hours
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('Rotational Shift', '08:00:00', '20:00:00', 10);

-- 10. US Shift (8 AM - 5 PM) - BPO
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('US Shift', '08:00:00', '17:00:00', 15);

-- 11. UK Shift (9 AM - 6 PM) - BPO
INSERT INTO shifts (name, start_time, end_time, late_threshold_minutes)
VALUES ('UK Shift', '09:00:00', '18:00:00', 15);

-- Verification Query
SELECT 
  name,
  start_time,
  end_time,
  late_threshold_minutes
FROM shifts
ORDER BY start_time;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✅ Industry standard shifts added successfully!';
  RAISE NOTICE '📊 Total shifts: %', (SELECT COUNT(*) FROM shifts);
  RAISE NOTICE '🏢 Shift types:';
  RAISE NOTICE '   - General/Day Shifts (9-5, 8-5, 10-7)';
  RAISE NOTICE '   - Morning Shifts (5 AM, 6 AM)';
  RAISE NOTICE '   - Afternoon Shifts (2 PM)';
  RAISE NOTICE '   - Night Shifts (10 PM)';
  RAISE NOTICE '   - Weekend/Rotational Shifts';
  RAISE NOTICE '   - International Shifts (US, UK)';
END $$;
