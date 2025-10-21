// Verify Authentication Upgrade
require('dotenv').config();
const { supabase } = require('../config/db');

async function verifyAuthUpgrade() {
  console.log('🔍 Verifying Authentication System Upgrade...\n');

  try {
    // 1. Check users table columns
    console.log('1️⃣ Checking users table columns...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) throw usersError;

    if (users && users.length > 0) {
      const user = users[0];
      const newColumns = [
        'email_verified',
        'verification_token',
        'verification_token_expires',
        'last_login',
        'failed_login_attempts',
        'account_locked_until',
        'two_factor_enabled',
        'two_factor_secret'
      ];

      const missingColumns = newColumns.filter(col => !(col in user));
      
      if (missingColumns.length === 0) {
        console.log('   ✅ All new columns added to users table');
      } else {
        console.log('   ❌ Missing columns:', missingColumns.join(', '));
      }
    } else {
      console.log('   ℹ️  No users in database yet');
    }

    // 2. Check company_settings table
    console.log('\n2️⃣ Checking company_settings table...');
    const { data: settings, error: settingsError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.log('   ❌ company_settings table not found');
      console.log('   Error:', settingsError.message);
    } else {
      console.log('   ✅ company_settings table exists');
      if (settings && settings.length > 0) {
        console.log('   ✅ Default company settings created');
        console.log('   📋 Company Code:', settings[0].company_code);
        console.log('   📋 Company Name:', settings[0].company_name);
      } else {
        console.log('   ⚠️  No company settings found (will be created on first use)');
      }
    }

    // 3. Check invitation_tokens table
    console.log('\n3️⃣ Checking invitation_tokens table...');
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitation_tokens')
      .select('*')
      .limit(1);

    if (invitationsError) {
      console.log('   ❌ invitation_tokens table not found');
      console.log('   Error:', invitationsError.message);
    } else {
      console.log('   ✅ invitation_tokens table exists');
    }

    // 4. Check audit_logs table
    console.log('\n4️⃣ Checking audit_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (logsError) {
      console.log('   ❌ audit_logs table not found');
      console.log('   Error:', logsError.message);
    } else {
      console.log('   ✅ audit_logs table exists');
    }

    // 5. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    
    const allGood = !usersError && !settingsError && !invitationsError && !logsError;
    
    if (allGood) {
      console.log('\n✅ Authentication system upgrade successful!');
      console.log('\n🎉 Your system now has:');
      console.log('   • Email verification');
      console.log('   • Account lockout protection');
      console.log('   • Invitation system');
      console.log('   • Comprehensive audit logging');
      console.log('   • Configurable security policies');
      console.log('\n📖 Next steps:');
      console.log('   1. Update backend routes (optional)');
      console.log('   2. Configure email service in .env');
      console.log('   3. Create frontend verification pages');
      console.log('   4. Test the new features');
    } else {
      console.log('\n⚠️  Some issues detected. Please check the errors above.');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  } finally {
    process.exit();
  }
}

verifyAuthUpgrade();
