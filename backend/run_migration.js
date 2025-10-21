const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jcgdqhxkqvvqgqtdxgzw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2RxaHhrcXZ2cWdxdGR4Z3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkzNDI1NzEsImV4cCI6MjA0NDkxODU3MX0.9xqQNOmOCHqkwLCLjXMdJhJLhqTNjhRnhUwCdBZhVWs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔧 Adding missing columns to communication_questions table...');
    
    // Test if we can query the table first
    console.log('🔍 Testing current table structure...');
    const { data: testData, error: testError } = await supabase
      .from('communication_questions')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Cannot access communication_questions table:', testError.message);
      console.log('💡 You may need to run the table creation script first.');
      process.exit(1);
    }
    
    console.log('✅ Table exists! Current sample data:', testData);
    
    // Try to insert a test record with new fields to see what's missing
    console.log('\n🧪 Testing which columns are missing...');
    
    const testRecord = {
      application_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      question_text: 'Test question',
      question_type: 'reading',
      section: 'Reading',
      title: 'Test Title',
      skill: 'reading',
      subtype: 'passage',
      difficulty: 'easy'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('communication_questions')
      .insert(testRecord)
      .select();
      
    if (insertError) {
      console.log('❌ Missing columns detected:', insertError.message);
      console.log('💡 Please run the SQL migration manually in Supabase dashboard:');
      console.log(`
-- Add missing columns to communication_questions table
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS skill VARCHAR(50);
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS subtype VARCHAR(50);
ALTER TABLE communication_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';
      `);
    } else {
      console.log('✅ All columns exist! Test record created:', insertData);
      
      // Clean up test record
      await supabase
        .from('communication_questions')
        .delete()
        .eq('application_id', '00000000-0000-0000-0000-000000000000');
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

runMigration();
