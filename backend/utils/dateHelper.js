/**
 * Date Helper Utilities for Indian Standard Time (IST)
 * Handles timezone issues and ensures consistent date parsing
 */

/**
 * Parse a YYYY-MM-DD date string as IST local date
 * Avoids timezone issues by creating date in local timezone
 * @param {string} dateStr - Date string in format 'YYYY-MM-DD'
 * @returns {Date} - Date object in IST
 */
const parseISTDate = (dateStr) => {
  if (!dateStr) return null;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in local timezone (IST)
  // month is 0-indexed in JavaScript
  return new Date(year, month - 1, day);
};

/**
 * Format a Date object to YYYY-MM-DD string in IST
 * @param {Date} date - Date object
 * @returns {string} - Date string in format 'YYYY-MM-DD'
 */
const formatISTDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current date in IST as YYYY-MM-DD string
 * @returns {string} - Today's date in format 'YYYY-MM-DD'
 */
const getTodayIST = () => {
  return formatISTDate(new Date());
};

/**
 * Check if a date is a weekend (Saturday or Sunday) in IST
 * @param {string} dateStr - Date string in format 'YYYY-MM-DD'
 * @returns {boolean} - True if weekend, false if weekday
 */
const isWeekend = (dateStr) => {
  const date = parseISTDate(dateStr);
  if (!date) return false;
  
  const dayOfWeek = date.getDay();
  const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  
  console.log(`🗓️ IST Date Check: ${dateStr} → ${date.toDateString()} → Day ${dayOfWeek} → ${isWeekendDay ? 'Weekend' : 'Weekday'}`);
  
  return isWeekendDay;
};

/**
 * Check if a date is a weekday (Monday-Friday) in IST
 * @param {string} dateStr - Date string in format 'YYYY-MM-DD'
 * @returns {boolean} - True if weekday, false if weekend
 */
const isWeekday = (dateStr) => {
  return !isWeekend(dateStr);
};

/**
 * Get day of week name for a date in IST
 * @param {string} dateStr - Date string in format 'YYYY-MM-DD'
 * @returns {string} - Day name (e.g., 'Monday', 'Tuesday')
 */
const getDayName = (dateStr) => {
  const date = parseISTDate(dateStr);
  if (!date) return 'Invalid Date';
  
  return date.toLocaleDateString('en-IN', { weekday: 'long' });
};

/**
 * Get all dates in a range (inclusive)
 * @param {string} startDateStr - Start date in format 'YYYY-MM-DD'
 * @param {string} endDateStr - End date in format 'YYYY-MM-DD'
 * @returns {string[]} - Array of date strings in format 'YYYY-MM-DD'
 */
const getDateRange = (startDateStr, endDateStr) => {
  const dates = [];
  const startDate = parseISTDate(startDateStr);
  const endDate = parseISTDate(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!startDate || !endDate) return dates;
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate && currentDate <= today) {
    dates.push(formatISTDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Get all working days (weekdays) in a range
 * @param {string} startDateStr - Start date in format 'YYYY-MM-DD'
 * @param {string} endDateStr - End date in format 'YYYY-MM-DD'
 * @param {string} employeeStartDate - Optional employee start date to filter from
 * @returns {string[]} - Array of working day date strings
 */
const getWorkingDays = (startDateStr, endDateStr, employeeStartDate = null) => {
  let startDate = parseISTDate(startDateStr);
  const endDate = parseISTDate(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!startDate || !endDate) return [];
  
  // If employee has a start date, use the later of (start, employeeStartDate)
  if (employeeStartDate) {
    const empStart = parseISTDate(employeeStartDate);
    if (empStart && empStart > startDate) {
      startDate = empStart;
      console.log(`✅ Employee started on ${employeeStartDate}, counting from this date`);
    }
  }
  
  const workingDays = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate && currentDate <= today) {
    const dateStr = formatISTDate(currentDate);
    if (isWeekday(dateStr)) {
      workingDays.push(dateStr);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`📅 Working days count: ${workingDays.length} (from ${formatISTDate(startDate)} to ${formatISTDate(endDate <= today ? endDate : today)})`);
  
  return workingDays;
};

/**
 * Compare two dates
 * @param {string} date1Str - First date in format 'YYYY-MM-DD'
 * @param {string} date2Str - Second date in format 'YYYY-MM-DD'
 * @returns {number} - Negative if date1 < date2, 0 if equal, positive if date1 > date2
 */
const compareDates = (date1Str, date2Str) => {
  const date1 = parseISTDate(date1Str);
  const date2 = parseISTDate(date2Str);
  
  if (!date1 || !date2) return 0;
  
  return date1.getTime() - date2.getTime();
};

module.exports = {
  parseISTDate,
  formatISTDate,
  getTodayIST,
  isWeekend,
  isWeekday,
  getDayName,
  getDateRange,
  getWorkingDays,
  compareDates
};
