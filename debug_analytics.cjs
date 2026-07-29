const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://celsdouievgvgtdrgcgn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbHNkb3VpZXZndmd0ZHJnY2duIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3MjI4MywiZXhwIjoyMDk2NzQ4MjgzfQ.1Mp-Jlbp-6e7Cm-wwjqSSjYuhrC5BYTz72vm9A6xnFA'
);

// Simulate getLinkedInAnalytics logic
async function getLinkedInAnalytics(employeeId) {
  const { data: latestImport, error: impErr } = await supabase
    .from('linkedin_imports')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (impErr || !latestImport) {
    console.log('No latest import:', impErr?.message);
    return null;
  }

  console.log('Latest import found:', latestImport.id, latestImport.filename);
  console.log('Datasets detected:', latestImport.datasets_detected?.join(', '));
  console.log('Summary:', JSON.stringify(latestImport.summary, null, 2));

  const { data: invitations, error: invErr } = await supabase
    .from('linkedin_invitations')
    .select('*')
    .eq('import_id', latestImport.id)
    .eq('employee_id', employeeId);

  if (invErr) console.log('Inv error:', invErr.message);
  console.log(`Invitations: ${invitations?.length || 0}`);
  if (invitations?.length > 0) {
    console.log('First invitation:', JSON.stringify(invitations[0]));

    // Test the aggregation logic
    const granularity = 'quarterly';
    const invRows = invitations.map(i => ({
      direction: i.direction,
      invitation_date: i.invitation_date ?? null,
    }));
    
    const filtered = invRows.filter(r => {
      const dir = r.direction?.toUpperCase();
      const pass = (dir === 'OUTGOING' || dir === 'SENT') && r.invitation_date;
      return pass;
    });
    console.log(`Filtered (with direction & date): ${filtered.length} / ${invitations.length}`);
    
    if (filtered.length > 0) {
      const d = new Date(filtered[0].invitation_date);
      console.log(`Sample date: ${filtered[0].invitation_date} -> ${d} -> valid=${!Number.isNaN(d.getTime())}`);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const yr = String(d.getFullYear()).slice(2);
      console.log(`Period key: '${yr}Q${q}`);
    }
  }

  const { data: connections, error: connErr } = await supabase
    .from('linkedin_connections')
    .select('*')
    .eq('import_id', latestImport.id)
    .eq('employee_id', employeeId);

  if (connErr) console.log('Conn error:', connErr.message);
  console.log(`Connections: ${connections?.length || 0}`);
}

(async () => {
  // Get employees
  const { data: employees } = await supabase.from('employees').select('id, email');
  console.log('Employees:', employees?.map(e => `${e.id}: ${e.email}`).join(', '));
  
  for (const emp of employees || []) {
    console.log(`\n=== Employee: ${emp.email} (${emp.id}) ===`);
    await getLinkedInAnalytics(emp.id);
  }
})();
