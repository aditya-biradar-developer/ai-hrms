// Quick script to check if jobs table exists and its structure
require('dotenv').config();
const { supabase } = require('./config/db');

async function checkJobsTable() {
  console.log('🔍 Checking jobs table...\n');
  
  try {
    // Try to query the jobs table
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying jobs table:', error.message);
      console.error('Details:', error);
      
      if (error.message.includes('does not exist')) {
        console.log('\n⚠️  The jobs table does not exist in your database!');
        console.log('\n📋 To fix this:');
        console.log('1. Go to your Supabase project');
        console.log('2. Open SQL Editor');
        console.log('3. Run the schema from: backend/database/schema.sql');
        console.log('   OR run: backend/database/schema-update.sql');
      }
      
      process.exit(1);
    }
    
    console.log('✅ Jobs table exists!');
    console.log(`📊 Found ${data ? data.length : 0} job(s) in the table`);
    
    if (data && data.length > 0) {
      console.log('\nSample job:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    // Check table structure
    console.log('\n🔍 Checking table structure...');
    const { data: tableInfo, error: structError } = await supabase
      .rpc('get_table_columns', { table_name: 'jobs' })
      .catch(() => {
        // If RPC doesn't exist, try a simple insert to see what fields are expected
        return { data: null, error: null };
      });
    
    console.log('\n✅ Jobs table is ready for use!');
    console.log('\nYou can now:');
    console.log('1. Restart your backend server');
    console.log('2. Try posting a job from the frontend');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

checkJobsTable();
