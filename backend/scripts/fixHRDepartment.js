// Fix HR Department Script
require('dotenv').config();
const { supabase } = require('../config/db');

async function fixHRDepartment() {
  console.log('\n🔧 Fixing HR Department...\n');

  try {
    // Update all HR users to have HR department
    const { data, error } = await supabase
      .from('users')
      .update({ department: 'HR' })
      .eq('role', 'hr')
      .select();

    if (error) throw error;

    console.log('✅ Updated HR users:');
    data.forEach(user => {
      console.log(`   • ${user.name} (${user.email}) → Department: HR`);
    });

    console.log(`\n✅ Fixed ${data.length} HR user(s)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

fixHRDepartment();
