-- Delete Weekend Attendance Records
-- Remove all attendance marked on Saturdays and Sundays

-- Delete attendance records for weekends
DELETE FROM attendance
WHERE EXTRACT(DOW FROM date) IN (0, 6);
-- 0 = Sunday, 6 = Saturday

-- Show how many records were deleted
DO $$
BEGIN
  RAISE NOTICE '✅ Weekend attendance records deleted successfully!';
  RAISE NOTICE '🎉 Employees can no longer mark attendance on Saturdays and Sundays';
END $$;

-- Verify remaining records
SELECT 
  COUNT(*) as total_records,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM attendance;
