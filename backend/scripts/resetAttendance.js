// Load environment variables first
require('dotenv').config();

const { supabase } = require('../config/db');

/**
 * Script to reset attendance data
 * 1. Delete all existing attendance records
 * 2. Create "present" attendance for all employees from start date to 16-10-2025
 */

async function resetAttendance() {
  try {
    console.log('🔄 Starting attendance reset...\n');

    // Step 1: Get all users (employees)
    console.log('📋 Fetching all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .neq('role', 'candidate'); // Exclude candidates

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`✅ Found ${users.length} users\n`);

    // Step 2: Delete all existing attendance records
    console.log('🗑️  Deleting all existing attendance records...');
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)

    if (deleteError) {
      throw new Error(`Error deleting attendance: ${deleteError.message}`);
    }

    console.log('✅ All attendance records deleted\n');

    // Step 3: Create present attendance for all employees
    console.log('📝 Creating present attendance records...');
    
    // Define date range: Start from Jan 1, 2025 to Oct 16, 2025
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-10-16');
    
    const attendanceRecords = [];
    
    // For each user
    for (const user of users) {
      console.log(`   Processing ${user.name} (${user.email})...`);
      
      // For each date from start to end
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Only create attendance for weekdays (Monday to Friday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          attendanceRecords.push({
            user_id: user.id,
            date: dateStr,
            status: 'present'
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`\n📊 Total records to create: ${attendanceRecords.length}`);
    console.log('💾 Inserting records into database...');

    // Insert in batches of 100 to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
      const batch = attendanceRecords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(batch);

      if (insertError) {
        throw new Error(`Error inserting batch: ${insertError.message}`);
      }

      console.log(`   ✅ Inserted ${Math.min(i + batchSize, attendanceRecords.length)}/${attendanceRecords.length} records`);
    }

    console.log('\n✅ Attendance reset completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users processed: ${users.length}`);
    console.log(`   - Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    console.log(`   - Total records created: ${attendanceRecords.length}`);
    console.log(`   - Status: All marked as "present"`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit();
  }
}

// Run the script
resetAttendance();
