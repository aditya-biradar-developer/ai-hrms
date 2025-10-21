// Verify Performance Review System Setup
require('dotenv').config();
const { supabase } = require('./config/db');

async function verifySetup() {
  console.log('\n🔍 Verifying Performance Review System Setup...\n');
  
  let allGood = true;
  
  try {
    // Test 1: Check if performance table exists
    console.log('1️⃣ Checking performance table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('performance')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('   ❌ Performance table does not exist!');
      console.log('   → Run: backend/database/performance-complete-fix.sql in Supabase');
      allGood = false;
    } else {
      console.log('   ✅ Performance table exists');
    }
    
    // Test 2: Check required columns
    console.log('\n2️⃣ Checking required columns...');
    const requiredColumns = [
      'user_id', 'reviewer_id', 'review_period_start', 'review_period_end',
      'quality_of_work', 'productivity', 'communication', 'teamwork',
      'problem_solving', 'initiative', 'attendance_punctuality',
      'goals', 'achievements', 'areas_of_improvement',
      'manager_comments', 'overall_rating', 'recommendation', 'status'
    ];
    
    // Try to insert a test record (will fail but show which columns are missing)
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      reviewer_id: '00000000-0000-0000-0000-000000000000',
      review_period_start: '2025-01-01',
      review_period_end: '2025-12-31',
      quality_of_work: 3,
      productivity: 3,
      communication: 3,
      teamwork: 3,
      problem_solving: 3,
      initiative: 3,
      attendance_punctuality: 3,
      goals: 'Test',
      achievements: 'Test',
      areas_of_improvement: 'Test',
      manager_comments: 'Test',
      overall_rating: 3,
      recommendation: 'none',
      status: 'draft'
    };
    
    const { error: insertError } = await supabase
      .from('performance')
      .insert(testData);
    
    if (insertError) {
      if (insertError.message.includes('does not exist')) {
        const missingColumn = insertError.message.match(/column "(\w+)"/)?.[1];
        console.log(`   ❌ Missing column: ${missingColumn}`);
        console.log('   → Run: backend/database/performance-complete-fix.sql in Supabase');
        allGood = false;
      } else if (insertError.message.includes('foreign key')) {
        console.log('   ✅ All columns exist (foreign key error is expected for test data)');
        // This is expected - we're using fake UUIDs
      } else {
        console.log('   ⚠️  Unexpected error:', insertError.message);
      }
    } else {
      // Delete the test record
      await supabase
        .from('performance')
        .delete()
        .eq('user_id', '00000000-0000-0000-0000-000000000000');
      console.log('   ✅ All columns exist and working');
    }
    
    // Test 3: Check users table
    console.log('\n3️⃣ Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .limit(5);
    
    if (usersError) {
      console.log('   ❌ Error fetching users:', usersError.message);
      allGood = false;
    } else if (!users || users.length === 0) {
      console.log('   ⚠️  No users found in database');
      console.log('   → Create at least one admin/manager user to test');
    } else {
      console.log(`   ✅ Found ${users.length} user(s)`);
      const adminOrManager = users.find(u => ['admin', 'manager'].includes(u.role));
      if (adminOrManager) {
        console.log(`   ✅ Admin/Manager user exists: ${adminOrManager.email}`);
      } else {
        console.log('   ⚠️  No admin/manager users found');
        console.log('   → Update a user role to admin or manager');
      }
    }
    
    // Test 4: Check existing performance reviews
    console.log('\n4️⃣ Checking existing performance reviews...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('performance')
      .select('*')
      .limit(5);
    
    if (reviewsError) {
      console.log('   ❌ Error fetching reviews:', reviewsError.message);
    } else {
      console.log(`   ℹ️  Found ${reviews?.length || 0} existing review(s)`);
      if (reviews && reviews.length > 0) {
        console.log('   Sample review columns:', Object.keys(reviews[0]).join(', '));
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    if (allGood) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('\n🎉 Performance Review System is ready to use!');
      console.log('\nNext steps:');
      console.log('1. Start backend: npm run dev');
      console.log('2. Login as Admin/Manager');
      console.log('3. Go to Performance page');
      console.log('4. Click "Add Review" and test!');
    } else {
      console.log('❌ SETUP INCOMPLETE');
      console.log('\n🔧 Action required:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Run: backend/database/performance-complete-fix.sql');
      console.log('3. Run this script again to verify');
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your .env file has correct Supabase credentials');
    console.log('2. Ensure Supabase project is running');
    console.log('3. Run the database setup SQL script');
  }
  
  process.exit(allGood ? 0 : 1);
}

verifySetup();
