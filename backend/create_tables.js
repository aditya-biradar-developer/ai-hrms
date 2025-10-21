const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jcgdqhxkqvvqgqtdxgzw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2RxaHhrcXZ2cWdxdGR4Z3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkzNDI1NzEsImV4cCI6MjA0NDkxODU3MX0.9xqQNOmOCHqkwLCLjXMdJhJLhqTNjhRnhUwCdBZhVWs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('🏗️ Creating assessment tables...');
    
    // Test database connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('applications')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Cannot connect to database:', testError.message);
      console.log('💡 Please check your Supabase connection settings.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    
    // Check if communication_questions table exists
    console.log('\n🔍 Checking if communication_questions table exists...');
    const { data: tableData, error: tableError } = await supabase
      .from('communication_questions')
      .select('*')
      .limit(1);
      
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('❌ communication_questions table does not exist');
      console.log('💡 You need to create the table in Supabase dashboard.');
      console.log('\n📋 SQL to run in Supabase SQL Editor:');
      console.log(`
-- Create Communication Assessment Questions Table
CREATE TABLE IF NOT EXISTS communication_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL,
    passage TEXT,
    audio_url TEXT,
    instructions TEXT,
    options JSONB,
    correct_answer VARCHAR(10),
    evaluation_criteria JSONB,
    time_limit INTEGER DEFAULT 120,
    question_order INTEGER DEFAULT 0,
    title TEXT,
    skill VARCHAR(50),
    subtype VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_communication_questions_application_id 
ON communication_questions(application_id);
      `);
      
      console.log('\n🎯 Steps to fix:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the SQL above');
      console.log('3. Click "Run" to create the table');
      console.log('4. Run this script again');
      
    } else if (tableError) {
      console.log('⚠️ Other table error:', tableError.message);
    } else {
      console.log('✅ communication_questions table exists!');
      console.log('📊 Sample data:', tableData);
      
      // Test if all required columns exist
      console.log('\n🧪 Testing required columns...');
      const testRecord = {
        application_id: '00000000-0000-0000-0000-000000000000',
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
        console.log('\n📋 SQL to add missing columns:');
        console.log(`
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
        
        console.log('\n🎉 Database is ready for communication assessments!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();
