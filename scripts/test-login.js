#!/usr/bin/env node

/**
 * Test Login Script
 * Tests if the credentials work directly with Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  const email = 'mabdullahshafiq100@gmail.com';
  const password = 'MindVista@Dav2026';

  console.log('\n🔐 Testing Login with Supabase');
  console.log('=' .repeat(50));
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('=' .repeat(50));

  try {
    console.log('\n🔄 Attempting login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('\n❌ LOGIN FAILED');
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      console.error('Full Error:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log('\n✅ LOGIN SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('Session Token:', data.session.access_token.substring(0, 20) + '...');
    console.log('=' .repeat(50));
    
    // Now check employee record
    console.log('\n📋 Checking employee record...');
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    if (empError) {
      console.error('❌ Error fetching employee:', empError.message);
    } else if (!employee) {
      console.error('❌ No employee record found for this user');
    } else {
      console.log('✅ Employee record found');
      console.log('   Full Name:', employee.full_name);
      console.log('   Role:', employee.role);
      console.log('   PM Role:', employee.pm_role);
      console.log('   Status:', employee.status);
      console.log('   Employee Code:', employee.employee_code);
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testLogin();