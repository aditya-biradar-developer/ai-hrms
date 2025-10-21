// Reset Users Script - Clean slate for testing authentication
require('dotenv').config();
const { supabase } = require('../config/db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetUsers() {
  console.log('\n⚠️  WARNING: This will delete ALL user data!');
  console.log('This includes:');
  console.log('  - All users');
  console.log('  - All applications');
  console.log('  - All attendance records');
  console.log('  - All leaves');
  console.log('  - All notifications');
  console.log('  - All audit logs');
  console.log('  - All password reset tokens');
  console.log('\n');

  rl.question('Are you sure you want to continue? (type "YES" to confirm): ', async (answer) => {
    if (answer !== 'YES') {
      console.log('\n❌ Operation cancelled.');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('\n🗑️  Starting cleanup...\n');

      // 1. Delete audit logs
      console.log('1️⃣ Deleting audit logs...');
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (auditError) {
        console.log('   ⚠️  Audit logs table might not exist yet');
      } else {
        console.log('   ✅ Audit logs deleted');
      }

      // 2. Delete invitation tokens
      console.log('2️⃣ Deleting invitation tokens...');
      const { error: inviteError } = await supabase
        .from('invitation_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (inviteError) {
        console.log('   ⚠️  Invitation tokens table might not exist yet');
      } else {
        console.log('   ✅ Invitation tokens deleted');
      }

      // 3. Delete password reset tokens
      console.log('3️⃣ Deleting password reset tokens...');
      const { error: resetError } = await supabase
        .from('password_resets')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (resetError) {
        console.log('   ⚠️  Password resets:', resetError.message);
      } else {
        console.log('   ✅ Password reset tokens deleted');
      }

      // 4. Delete notifications
      console.log('4️⃣ Deleting notifications...');
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (notifError) {
        console.log('   ⚠️  Notifications:', notifError.message);
      } else {
        console.log('   ✅ Notifications deleted');
      }

      // 5. Delete leaves
      console.log('5️⃣ Deleting leaves...');
      const { error: leavesError } = await supabase
        .from('leaves')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (leavesError) {
        console.log('   ⚠️  Leaves:', leavesError.message);
      } else {
        console.log('   ✅ Leaves deleted');
      }

      // 6. Delete attendance
      console.log('6️⃣ Deleting attendance records...');
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (attendanceError) {
        console.log('   ⚠️  Attendance:', attendanceError.message);
      } else {
        console.log('   ✅ Attendance records deleted');
      }

      // 7. Delete applications
      console.log('7️⃣ Deleting job applications...');
      const { error: appsError } = await supabase
        .from('applications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (appsError) {
        console.log('   ⚠️  Applications:', appsError.message);
      } else {
        console.log('   ✅ Job applications deleted');
      }

      // 8. Delete performance records (must be before users due to foreign key)
      console.log('8️⃣ Deleting performance records...');
      const { error: performanceError } = await supabase
        .from('performance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (performanceError) {
        console.log('   ⚠️  Performance:', performanceError.message);
      } else {
        console.log('   ✅ Performance records deleted');
      }

      // 9. Delete payroll records (must be before users due to foreign key)
      console.log('9️⃣ Deleting payroll records...');
      const { error: payrollError } = await supabase
        .from('payroll')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (payrollError) {
        console.log('   ⚠️  Payroll:', payrollError.message);
      } else {
        console.log('   ✅ Payroll records deleted');
      }

      // 10. Delete jobs (must be before users due to foreign key)
      console.log('🔟 Deleting jobs...');
      const { error: jobsError } = await supabase
        .from('jobs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (jobsError) {
        console.log('   ⚠️  Jobs:', jobsError.message);
      } else {
        console.log('   ✅ Jobs deleted');
      }

      // 11. Delete users (this will cascade to related data)
      console.log('1️⃣1️⃣ Deleting all users...');
      const { data: deletedUsers, error: usersError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();
      
      if (usersError) {
        console.error('   ❌ Error deleting users:', usersError.message);
      } else {
        console.log(`   ✅ Deleted ${deletedUsers?.length || 0} users`);
      }

      console.log('\n' + '='.repeat(50));
      console.log('✅ CLEANUP COMPLETE!');
      console.log('='.repeat(50));
      console.log('\n📝 Summary:');
      console.log('   • All users deleted');
      console.log('   • All related data cleaned up');
      console.log('   • Database ready for fresh testing');
      console.log('\n🎯 Next steps:');
      console.log('   1. Register a new user');
      console.log('   2. Test email verification');
      console.log('   3. Test account lockout');
      console.log('   4. Check audit logs\n');

    } catch (error) {
      console.error('\n❌ Error during cleanup:', error.message);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

// Run the script
resetUsers();
