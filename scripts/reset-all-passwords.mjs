import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PASSWORD = 'MindVista@Dev2026';

// List all auth users
const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
if (listErr) { console.error('List error:', listErr.message); process.exit(1); }
console.log(`Found ${users.length} auth users`);

// Reset password for ALL
for (const user of users) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: PASSWORD });
  if (error) console.log(`FAIL: ${user.email} — ${error.message}`);
  else console.log(`Reset OK: ${user.email}`);
}

// Test login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'mabdullahshafiq100@gmail.com',
  password: PASSWORD
});
if (error) console.log('Login FAILED:', error.message);
else console.log('Login OK:', data.user.email);
