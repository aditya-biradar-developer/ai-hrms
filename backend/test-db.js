require('dotenv').config();
const { supabase, testConnection } = require('./config/db');

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');
  
  // Test basic connection
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log('❌ Database connection failed');
    return;
  }
  
  // Test table access
  try {
    console.log('📊 Testing table access...');
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
    }
    
    // Test attendance table
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('count')
      .limit(1);
    
    if (attendanceError) {
      console.log('❌ Attendance table error:', attendanceError.message);
    } else {
      console.log('✅ Attendance table accessible');
    }
    
    // Test payroll table
    const { data: payroll, error: payrollError } = await supabase
      .from('payroll')
      .select('count')
      .limit(1);
    
    if (payrollError) {
      console.log('❌ Payroll table error:', payrollError.message);
    } else {
      console.log('✅ Payroll table accessible');
    }
    
    // Test performance table
    const { data: performance, error: performanceError } = await supabase
      .from('performance')
      .select('count')
      .limit(1);
    
    if (performanceError) {
      console.log('❌ Performance table error:', performanceError.message);
    } else {
      console.log('✅ Performance table accessible');
    }
    
    // Test jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    if (jobsError) {
      console.log('❌ Jobs table error:', jobsError.message);
    } else {
      console.log('✅ Jobs table accessible');
    }
    
    // Test applications table
    const { data: applications, error: applicationsError } = await supabase
      .from('applications')
      .select('count')
      .limit(1);
    
    if (applicationsError) {
      console.log('❌ Applications table error:', applicationsError.message);
    } else {
      console.log('✅ Applications table accessible');
    }
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

// Check environment variables
console.log('🔧 Checking environment variables...\n');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('');

testDatabase();