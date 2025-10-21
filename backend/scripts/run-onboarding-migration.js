const { supabase } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔧 Running onboarding migration...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '../migrations/add_onboarding_columns.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try running each statement individually as fallback
      console.log('📝 Trying individual statements...');
      
      const statements = [
        'ALTER TABLE applications ADD COLUMN IF NOT EXISTS onboarding_token TEXT',
        'ALTER TABLE applications ADD COLUMN IF NOT EXISTS onboarding_token_expires TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE applications ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE',
        'ALTER TABLE applications ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE'
      ];
      
      for (const stmt of statements) {
        console.log('Executing:', stmt);
        // Supabase doesn't support DDL directly, we need to do this via Supabase dashboard
        console.log('⚠️ Please run this SQL in your Supabase SQL Editor:');
        console.log(stmt + ';');
      }
      
      console.log('\n📝 Copy and run these statements in Supabase SQL Editor');
      console.log('👉 https://supabase.com/dashboard/project/_/sql');
    } else {
      console.log('✅ Migration completed successfully!', data);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
