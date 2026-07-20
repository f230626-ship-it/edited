#!/usr/bin/env node

/**
 * Create or Reset Admin Account
 * This script creates a new admin account or resets an existing one
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

async function createAdminAccount() {
  const email = 'mabdullahshafiq100@gmail.com';
  const password = 'MindVista@Dav2026';
  const fullName = 'Admin User';

  console.log('\n🔧 Creating/Resetting Admin Account');
  console.log('=' .repeat(50));
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('=' .repeat(50));

  try {
    // Step 1: Check if user exists
    console.log('\n📋 Step 1: Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.id);
      console.log('   Email verified:', existingUser.email_confirmed_at ? 'Yes' : 'No');
      
      // Update password
      console.log('\n🔄 Step 2: Updating password...');
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        }
      );
      
      if (updateError) {
        console.error('❌ Error updating user:', updateError.message);
        throw updateError;
      }
      
      console.log('✅ Password updated successfully');
      
      // Check employee record
      console.log('\n📋 Step 3: Checking employee record...');
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', existingUser.id)
        .single();
      
      if (empError || !employee) {
        console.log('⚠️ No employee record found, creating one...');
        
        const { error: insertError } = await supabase
          .from('employees')
          .insert({
            user_id: existingUser.id,
            full_name: fullName,
            email: email,
            role: 'admin',
            pm_role: 'admin',
            designation: 'System Administrator',
            employment_type: 'full_time',
            work_location: 'onsite',
            status: 'active',
            joining_date: new Date().toISOString().split('T')[0]
          });
        
        if (insertError) {
          console.error('❌ Error creating employee record:', insertError.message);
          throw insertError;
        }
        
        console.log('✅ Employee record created');
      } else {
        console.log('✅ Employee record exists');
        console.log(`   Role: ${employee.role}`);
        console.log(`   PM Role: ${employee.pm_role}`);
        
        // Update to admin if not already
        if (employee.role !== 'admin') {
          console.log('🔄 Updating role to admin...');
          const { error: roleError } = await supabase
            .from('employees')
            .update({ role: 'admin', pm_role: 'admin' })
            .eq('id', employee.id);
          
          if (roleError) {
            console.error('❌ Error updating role:', roleError.message);
          } else {
            console.log('✅ Role updated to admin');
          }
        }
      }
      
    } else {
      // Create new user
      console.log('ℹ️ User does not exist, creating new account...');
      
      console.log('\n🔄 Step 2: Creating auth user...');
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });
      
      if (createError) {
        console.error('❌ Error creating user:', createError.message);
        throw createError;
      }
      
      console.log('✅ Auth user created:', userData.user.id);
      
      // Create employee record
      console.log('\n🔄 Step 3: Creating employee record...');
      const { error: empInsertError } = await supabase
        .from('employees')
        .insert({
          user_id: userData.user.id,
          full_name: fullName,
          email: email,
          role: 'admin',
          pm_role: 'admin',
          designation: 'System Administrator',
          employment_type: 'full_time',
          work_location: 'onsite',
          status: 'active',
          joining_date: new Date().toISOString().split('T')[0]
        });
      
      if (empInsertError) {
        console.error('❌ Error creating employee record:', empInsertError.message);
        throw empInsertError;
      }
      
      console.log('✅ Employee record created');
    }
    
    console.log('\n✅ SUCCESS! Admin account is ready');
    console.log('=' .repeat(50));
    console.log('You can now log in with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    process.exit(1);
  }
}

createAdminAccount();