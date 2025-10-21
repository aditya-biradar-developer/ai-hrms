// Comprehensive setup validation script
require('dotenv').config();
const { testConnection, supabase } = require('./config/db');

async function validateSetup() {
  console.log('🔍 AI-HRMS Setup Validation\n');
  console.log('='.repeat(50));
  
  let allPassed = true;

  // 1. Check Environment Variables
  console.log('\n📋 Step 1: Environment Variables');
  console.log('-'.repeat(50));
  
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Set`);
    } else {
      console.log(`❌ ${varName}: Not set`);
      allPassed = false;
    }
  });

  // 2. Test Database Connection
  console.log('\n🗄️  Step 2: Database Connection');
  console.log('-'.repeat(50));
  
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Database connection successful');
  } else {
    console.log('❌ Database connection failed');
    allPassed = false;
  }

  // 3. Check Database Tables
  if (connected) {
    console.log('\n📊 Step 3: Database Tables');
    console.log('-'.repeat(50));
    
    const tables = [
      'users', 'departments', 'attendance', 'payroll', 
      'performance', 'jobs', 'applications', 'leaves', 
      'events', 'notifications', 'documents'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}': Not found or error`);
          allPassed = false;
        } else {
          console.log(`✅ Table '${table}': Exists`);
        }
      } catch (error) {
        console.log(`❌ Table '${table}': Error checking`);
        allPassed = false;
      }
    }
  }

  // 4. Check Required Modules
  console.log('\n📦 Step 4: Required Modules');
  console.log('-'.repeat(50));
  
  const requiredModules = [
    'express', 'cors', 'helmet', 'jsonwebtoken', 
    'bcryptjs', 'joi', '@supabase/supabase-js'
  ];
  
  requiredModules.forEach(moduleName => {
    try {
      require.resolve(moduleName);
      console.log(`✅ ${moduleName}: Installed`);
    } catch (error) {
      console.log(`❌ ${moduleName}: Not installed`);
      allPassed = false;
    }
  });

  // 5. Check Port Availability
  console.log('\n🔌 Step 5: Port Availability');
  console.log('-'.repeat(50));
  
  const port = process.env.PORT || 5000;
  console.log(`ℹ️  Will use port: ${port}`);

  // Final Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('🚀 Your backend is ready to start');
    console.log('\nRun: npm run dev');
    process.exit(0);
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('\n📋 Action Items:');
    console.log('1. Check .env file exists and has correct values');
    console.log('2. Run database schema in Supabase SQL Editor');
    console.log('3. Run: npm install');
    console.log('4. Check TROUBLESHOOTING.md for detailed help');
    process.exit(1);
  }
}

validateSetup().catch(error => {
  console.error('\n❌ Validation error:', error.message);
  process.exit(1);
});
