const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hvfxvxoqlvgksdtpaovj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Znh2eG9xbHZna3NkdHBhb3ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgzNDA3MCwiZXhwIjoyMDc1NDEwMDcwfQ.Xkl8hbrBMTx0xDrDfHXgKO614VTfJp1HEPnxLPYcl4k'
);

async function checkQuestions() {
  console.log('🔍 Checking recent aptitude questions...\n');
  
  // Get the most recent aptitude questions
  const { data, error } = await supabase
    .from('aptitude_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.log('❌ Error:', error);
    return;
  }
  
  console.log('📊 Recent Aptitude Questions:');
  console.log('Total found:', data?.length || 0);
  
  if (data && data.length > 0) {
    data.forEach((q, i) => {
      console.log(`\n🔍 Question ${i+1}:`);
      console.log('Topic:', q.topic);
      console.log('Difficulty:', q.difficulty);
      console.log('Question:', q.question_text.substring(0, 150) + '...');
      console.log('Correct Answer:', q.correct_answer);
      console.log('Options:', q.options);
      console.log('Created:', new Date(q.created_at).toLocaleString());
    });
    
    // Check if questions look AI-generated vs template
    const firstQuestion = data[0];
    console.log('\n🤖 AI Generation Analysis:');
    
    if (firstQuestion.question_text.includes('Software development involves writing code')) {
      console.log('❌ TEMPLATE QUESTIONS DETECTED - These are NOT AI-generated');
      console.log('❌ Old fallback questions are still being used');
    } else {
      console.log('✅ Questions appear to be AI-generated');
      console.log('✅ Unique content detected');
    }
    
    // Analyze correct answer distribution
    const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
    data.forEach(q => {
      if (answerCounts[q.correct_answer] !== undefined) {
        answerCounts[q.correct_answer]++;
      }
    });
    
    console.log('\n📈 Correct Answer Distribution:');
    Object.entries(answerCounts).forEach(([answer, count]) => {
      const percentage = ((count / data.length) * 100).toFixed(1);
      console.log(`${answer}: ${count}/${data.length} (${percentage}%)`);
    });
    
    if (answerCounts.B > data.length * 0.6) {
      console.log('⚠️ WARNING: Too many "B" answers - possible template issue');
    }
    
  } else {
    console.log('❌ No aptitude questions found in database');
  }
}

checkQuestions().catch(console.error);
