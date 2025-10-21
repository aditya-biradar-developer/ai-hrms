// Quick Reset Users Script - Deletes all users at once
require('dotenv').config();
const { supabase } = require('../config/db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetUsersQuick() {
  console.log('\n⚠️  WARNING: This will delete ALL data from ALL tables!');
  console.log('This is a COMPLETE database reset.\n');

  rl.question('Are you sure? Type "DELETE ALL" to confirm: ', async (answer) => {
    if (answer !== 'DELETE ALL') {
      console.log('\n❌ Operation cancelled.');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('\n🗑️  Deleting all data...\n');

      // List of all tables in dependency order (children first, parents last)
      const tables = [
        'audit_logs',
        'invitation_tokens',
        'password_resets',
        'notifications',
        'leaves',
        'attendance',
        'applications',
        'performance',
        'payroll',
        'events',
        'shifts',
        'jobs',
        'users'
      ];

      let deletedCount = 0;
      let errorCount = 0;

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')
            .select('id');

          if (error) {
            console.log(`   ⚠️  ${table}: ${error.message}`);
            errorCount++;
          } else {
            const count = data?.length || 0;
            if (count > 0) {
              console.log(`   ✅ ${table}: deleted ${count} records`);
              deletedCount += count;
            } else {
              console.log(`   ⚪ ${table}: empty`);
            }
          }
        } catch (err) {
          console.log(`   ❌ ${table}: ${err.message}`);
          errorCount++;
        }
      }

      console.log('\n' + '='.repeat(50));
      console.log('✅ CLEANUP COMPLETE!');
      console.log('='.repeat(50));
      console.log(`\n📊 Statistics:`);
      console.log(`   • Total records deleted: ${deletedCount}`);
      console.log(`   • Tables processed: ${tables.length}`);
      console.log(`   • Errors: ${errorCount}`);
      console.log('\n🎯 Database is now empty and ready for testing!');
      console.log('\n📝 Next steps:');
      console.log('   1. Start backend: npm run dev');
      console.log('   2. Start frontend: npm run dev');
      console.log('   3. Register a new user');
      console.log('   4. Test email verification');
      console.log('   5. Test account lockout\n');

    } catch (error) {
      console.error('\n❌ Error during cleanup:', error.message);
    } finally {
      rl.close();
      process.exit(0);
    }
  });
}

// Run the script
resetUsersQuick();
