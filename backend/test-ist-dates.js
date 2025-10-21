/**
 * Test IST Date Helper Functions
 * Run: node test-ist-dates.js
 */

const {
  parseISTDate,
  formatISTDate,
  getTodayIST,
  isWeekend,
  isWeekday,
  getDayName,
  getWorkingDays
} = require('./utils/dateHelper');

console.log('='.repeat(60));
console.log('IST DATE HELPER TESTS');
console.log('='.repeat(60));

console.log('\n📅 Current Date in IST:');
console.log('Today:', getTodayIST());
console.log('Current time:', new Date().toString());

console.log('\n🗓️ Test: Monday October 20, 2025');
const testDate = '2025-10-20';
console.log('Date:', testDate);
console.log('Parsed:', parseISTDate(testDate).toDateString());
console.log('Day Name:', getDayName(testDate));
console.log('Is Weekend?', isWeekend(testDate));
console.log('Is Weekday?', isWeekday(testDate));
console.log('Expected: Monday (Weekday) ✅');

console.log('\n🗓️ Test: Sunday October 19, 2025');
const sunday = '2025-10-19';
console.log('Date:', sunday);
console.log('Day Name:', getDayName(sunday));
console.log('Is Weekend?', isWeekend(sunday));
console.log('Expected: Sunday (Weekend) ✅');

console.log('\n🗓️ Test: Saturday October 25, 2025');
const saturday = '2025-10-25';
console.log('Date:', saturday);
console.log('Day Name:', getDayName(saturday));
console.log('Is Weekend?', isWeekend(saturday));
console.log('Expected: Saturday (Weekend) ✅');

console.log('\n📅 Test: Working Days in Current Week (Oct 19-25)');
const workingDays = getWorkingDays('2025-10-19', '2025-10-25');
console.log('Working Days:', workingDays);
console.log('Count:', workingDays.length);
console.log('Expected: 5 weekdays (Mon 20 - Fri 24) ✅');

console.log('\n📅 Test: Working Days in October 2025');
const octoberDays = getWorkingDays('2025-10-01', '2025-10-31');
console.log('Working Days Count:', octoberDays.length);
console.log('First few:', octoberDays.slice(0, 5));
console.log('Last few:', octoberDays.slice(-5));
console.log('Expected: ~22 weekdays in October ✅');

console.log('\n' + '='.repeat(60));
console.log('✅ IST DATE TESTS COMPLETED');
console.log('='.repeat(60));
