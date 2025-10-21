// Load environment variables first
require('dotenv').config();

const { supabase } = require('../config/db');

/**
 * Auto-mark employees as absent if they haven't marked attendance by end of working hours
 * This job should run daily after working hours (e.g., 7 PM)
 */
async function autoMarkAbsent() {
  try {
    console.log('🤖 Starting auto-mark absent job...');
    console.log('🔗 Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('🔑 Supabase Key:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('⏭️  Skipping: Today is a weekend');
      return;
    }
    
    console.log(`📅 Processing date: ${todayStr}`);
    
    // Get all active employees (not candidates)
    console.log('📡 Fetching users from database...');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .neq('role', 'candidate');
    
    if (usersError) {
      console.error('❌ Supabase error details:', usersError);
      throw new Error(`Error fetching users: ${usersError.message}`);
    }
    
    console.log(`👥 Found ${allUsers.length} users to check`);
    
    // Get all attendance records for today
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('user_id')
      .eq('date', todayStr);
    
    if (attendanceError) {
      throw new Error(`Error fetching attendance: ${attendanceError.message}`);
    }
    
    // Get list of user IDs who have already marked attendance
    const markedUserIds = new Set(todayAttendance.map(record => record.user_id));
    
    // Get all approved leaves for today
    const { data: approvedLeaves, error: leavesError } = await supabase
      .from('leaves')
      .select('user_id')
      .eq('status', 'approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);
    
    if (leavesError) {
      throw new Error(`Error fetching leaves: ${leavesError.message}`);
    }
    
    // Get list of user IDs who are on approved leave
    const onLeaveUserIds = new Set(approvedLeaves.map(leave => leave.user_id));
    
    console.log(`✅ ${markedUserIds.size} users have marked attendance`);
    console.log(`🏖️  ${onLeaveUserIds.size} users are on approved leave`);
    
    // Find users who haven't marked attendance and are not on leave
    const unmarkedUsers = allUsers.filter(user => 
      !markedUserIds.has(user.id) && !onLeaveUserIds.has(user.id)
    );
    
    // Find users who are on approved leave but haven't marked attendance
    const usersOnLeave = allUsers.filter(user => 
      !markedUserIds.has(user.id) && onLeaveUserIds.has(user.id)
    );
    
    if (unmarkedUsers.length === 0 && usersOnLeave.length === 0) {
      console.log('✅ All users have marked attendance or are on leave. No action needed.');
      return;
    }
    
    const recordsToInsert = [];
    
    // Create absent records for unmarked users (not on leave)
    if (unmarkedUsers.length > 0) {
      console.log(`⚠️  ${unmarkedUsers.length} users haven't marked attendance (will mark as absent):`);
      unmarkedUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
        recordsToInsert.push({
          user_id: user.id,
          date: todayStr,
          status: 'absent'
        });
      });
    }
    
    // Create on_leave records for users on approved leave
    if (usersOnLeave.length > 0) {
      console.log(`🏖️  ${usersOnLeave.length} users on approved leave (will mark as on_leave):`);
      usersOnLeave.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
        recordsToInsert.push({
          user_id: user.id,
          date: todayStr,
          status: 'on_leave'
        });
      });
    }
    
    console.log(`📝 Inserting ${recordsToInsert.length} attendance records...`);
    
    const { error: insertError } = await supabase
      .from('attendance')
      .insert(recordsToInsert);
    
    if (insertError) {
      throw new Error(`Error inserting attendance records: ${insertError.message}`);
    }
    
    console.log('✅ Auto-mark absent job completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total users: ${allUsers.length}`);
    console.log(`   - Already marked: ${markedUserIds.size}`);
    console.log(`   - On approved leave: ${usersOnLeave.length}`);
    console.log(`   - Marked as absent: ${unmarkedUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error in auto-mark absent job:', error.message);
    console.error(error);
  }
}

module.exports = { autoMarkAbsent };
