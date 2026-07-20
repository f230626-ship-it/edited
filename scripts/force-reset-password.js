#!/usr/bin/env node

/**
 * Force Reset Password
 * Uses Supabase Admin API to forcefully update the password
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forceResetPassword() {
  const email = 'mabdullahshafiq100@gmail.com';
  const newPassword = 'MindVista@Dav2026';

  console.log('\n🔒 Force Resetting Password');
  console.log('=' .repeat(50));
  console.log(`Email: ${email}`);
  console.log(`New Password: ${newPassword}`);
  console.log('=' .repeat(50));

  try {
    // Step 1: Find the user
    console.log('\n📋 Step 1: Finding user...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    console.log('✅ User found:', user.id);

    // Step 2: Delete all existing sessions
    console.log('\n🔄 Step 2: Deleting all existing sessions...');
    try {
      await supabase.auth.admin.signOut(user.id, 'global');
      console.log('✅ All sessions deleted');
    } catch (e) {
      console.log('⚠️ Session deletion failed (might not have sessions):', e.message);
    }

    // Step 3: Update password using Admin API
    console.log('\n🔄 Step 3: Updating password with Admin API...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );
    
    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }
    
    console.log('✅ Password updated via Admin API');

    // Step 4: Test the new password
    console.log('\n🧪 Step 4: Testing new password...');
    
    // Create a new client for testing (without admin privileges)
    const testClient = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: testData, error: testError } = await testClient.auth.signInWithPassword({
      email: email,
      password: newPassword
    });

    if (testError) {
      console.error('❌ Test login FAILED');
      console.error('Error:', testError.message);
      throw new Error(`Password test failed: ${testError.message}`);
    }

    console.log('✅ Test login SUCCESSFUL!');
    console.log('   User ID:', testData.user.id);
    console.log('   Email:', testData.user.email);

    // Clean up test session
    await testClient.auth.signOut();

    console.log('\n✅ SUCCESS! Password has been reset and verified');
    console.log('=' .repeat(50));
    console.log('You can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

forceResetPassword();