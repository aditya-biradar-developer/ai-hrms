// Load environment variables first
require('dotenv').config();

const { supabase } = require('../config/db');

/**
 * Script to remove today's attendance records for testing
 */
async function removeTodayAttendance() {
  try {
    console.log('🗑️  Removing today\'s attendance records...\n');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`📅 Date: ${todayStr}`);

    // Get today's attendance records before deleting
    const { data: todayRecords, error: fetchError } = await supabase
      .from('attendance')
      .select('id, user_id, status')
      .eq('date', todayStr);

    if (fetchError) {
      throw new Error(`Error fetching attendance: ${fetchError.message}`);
    }

    if (!todayRecords || todayRecords.length === 0) {
      console.log('ℹ️  No attendance records found for today.');
      return;
    }

    console.log(`📊 Found ${todayRecords.length} attendance records for today\n`);

    // Delete today's attendance
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('date', todayStr);

    if (deleteError) {
      throw new Error(`Error deleting attendance: ${deleteError.message}`);
    }

    console.log('✅ Successfully deleted all attendance records for today!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Date: ${todayStr}`);
    console.log(`   - Records deleted: ${todayRecords.length}`);
    console.log('\n💡 Now you can:');
    console.log('   1. Mark attendance for some employees');
    console.log('   2. Approve leaves for some employees');
    console.log('   3. Leave some employees unmarked');
    console.log('   4. Run: npm run mark-absent');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit();
  }
}

// Run the script
removeTodayAttendance();
