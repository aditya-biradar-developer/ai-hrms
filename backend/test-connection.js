// Test database connection
require('dotenv').config();
const { testConnection } = require('./config/db');

async function test() {
  console.log('🔍 Testing database connection...\n');
  console.log('Environment variables:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Not set');
  console.log('');

  const connected = await testConnection();
  
  if (connected) {
    console.log('✅ Database connection successful!');
    console.log('✅ Backend is ready to start');
    process.exit(0);
  } else {
    console.log('❌ Database connection failed!');
    console.log('');
    console.log('Troubleshooting steps:');
    console.log('1. Check if .env file exists in backend directory');
    console.log('2. Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct');
    console.log('3. Ensure your Supabase project is active');
    console.log('4. Check your internet connection');
    process.exit(1);
  }
}

test();
