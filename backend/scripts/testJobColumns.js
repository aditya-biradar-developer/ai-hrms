// Load environment variables
require('dotenv').config();

const { supabase } = require('../config/db');

async function testJobColumns() {
  try {
    console.log('🔍 Testing job columns...\n');

    // Get a sample job
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);

    if (error) {
      throw new Error(`Error fetching jobs: ${error.message}`);
    }

    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log('✅ Sample job data:');
      console.log({
        id: job.id,
        title: job.title,
        status: job.status,
        posted_date: job.posted_date,
        last_date_to_apply: job.last_date_to_apply,
        vacancies: job.vacancies,
        filled_positions: job.filled_positions
      });

      // Check if new columns exist
      const hasNewColumns = 
        'posted_date' in job &&
        'last_date_to_apply' in job &&
        'vacancies' in job &&
        'filled_positions' in job;

      if (hasNewColumns) {
        console.log('\n✅ All new columns exist in the database!');
      } else {
        console.log('\n❌ Some columns are missing. Please run the migration:');
        console.log('   Go to Supabase Dashboard > SQL Editor');
        console.log('   Run the SQL from: backend/migrations/add_job_fields.sql');
      }
    } else {
      console.log('ℹ️  No jobs found in database');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testJobColumns();
