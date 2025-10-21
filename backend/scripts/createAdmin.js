// Create Admin User Script
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdmin() {
  console.log('\n👑 Create Admin User\n');

  // Get admin details
  const name = await question('Admin Name: ');
  const email = await question('Admin Email: ');
  const password = await question('Admin Password (min 6 chars): ');
  const department = await question('Department (default: Administration): ') || 'Administration';

  if (!name || !email || !password) {
    console.log('\n❌ All fields are required!');
    rl.close();
    process.exit(1);
  }

  if (password.length < 6) {
    console.log('\n❌ Password must be at least 6 characters!');
    rl.close();
    process.exit(1);
  }

  try {
    console.log('\n🔍 Checking if user exists...');
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('\n⚠️  User already exists!');
      const update = await question('Update existing user to admin? (yes/no): ');
      
      if (update.toLowerCase() === 'yes') {
        const { error } = await supabase
          .from('users')
          .update({ 
            role: 'admin',
            email_verified: true 
          })
          .eq('email', email);

        if (error) throw error;
        
        console.log('\n✅ User updated to admin successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`👤 Role: admin`);
      } else {
        console.log('\n❌ Operation cancelled.');
      }
      
      rl.close();
      process.exit(0);
    }

    // Hash password
    console.log('\n🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    console.log('👤 Creating admin user...');
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: hashedPassword,
        role: 'admin',
        department,
        email_verified: true, // Auto-verify admin
        created_at: new Date()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('\n' + '='.repeat(50));
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`\n👤 Name: ${newUser.name}`);
    console.log(`📧 Email: ${newUser.email}`);
    console.log(`🎭 Role: ${newUser.role}`);
    console.log(`🏢 Department: ${newUser.department}`);
    console.log(`✅ Email Verified: Yes`);
    console.log(`\n🎯 You can now login with these credentials!\n`);

  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Run the script
createAdmin();
