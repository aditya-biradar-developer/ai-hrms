/**
 * Clear all applications from database
 * WARNING: This will delete ALL application records
 */

require('dotenv').config();
const { supabase } = require('../config/db');

async function clearApplications() {
  try {
    console.log('⚠️  WARNING: This will delete ALL applications from the database!');
    console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🗑️  Deleting all applications...');
    
    const { data, error } = await supabase
      .from('applications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)
    
    if (error) {
      console.error('❌ Error deleting applications:', error.message);
      process.exit(1);
    }
    
    console.log('✅ All applications deleted successfully!');
    console.log('📊 You can now create fresh test applications');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearApplications();
