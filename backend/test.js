const now = new Date();
console.log({
  fullDate: now.toString(),
  dayName: now.toLocaleDateString('en-IN', { weekday: 'long' }),
  dayOfWeek: now.getDay(),
  date: '2025-10-20'
});