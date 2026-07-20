#!/usr/bin/env node

/**
 * Set Simple Password
 * Sets a very simple password for testing
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setSimplePassword() {
  const email = 'mabdullahshafiq100@gmail.com';
  const newPassword = 'admin123456'; // Very simple password for testing

  console.log('\n🔐 Setting Simple Password');
  console.log('=' .repeat(50));
  console.log(`Email: ${email}`);
  console.log(`New Password: ${newPassword}`);
  console.log('=' .repeat(50));

  try {
    // Find user
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found');
    }

    console.log('\n✅ User found:', user.id);

    // Sign out all sessions
    console.log('\n🔄 Signing out all sessions...');
    await supabase.auth.admin.signOut(user.id, 'global');
    
    // Update password
    console.log('\n🔄 Updating password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );
    
    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`);
    }
    
    console.log('✅ Password updated');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test with anon client
    console.log('\n🧪 Testing with anon client...');
    const testClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await testClient.auth.signInWithPassword({
      email: email,
      password: newPassword
    });

    if (error) {
      console.error('❌ Test FAILED:', error.message);
      console.error('Error code:', error.code);
      throw new Error('Test login failed');
    }

    console.log('✅ Test SUCCESSFUL!');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Has Session:', !!data.session);

    await testClient.auth.signOut();

    console.log('\n✅ SUCCESS!');
    console.log('=' .repeat(50));
    console.log('Login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

setSimplePassword();