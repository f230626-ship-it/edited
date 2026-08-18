import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkQueue() {
  const { data: queue, error } = await supabase.from('payroll_email_queue').select('*');
  
  if (error) {
    console.error("Error fetching queue:", error);
  } else {
    console.log(`Found ${queue.length} items in the email queue.`);
    if (queue.length > 0) {
      console.log(queue.map(q => ({
          id: q.id,
          status: q.status,
          employee_id: q.employee_id,
          to_email: q.to_email,
          invoice_id: q.invoice_id
      })));
    }
  }

  const { data: invoices, error: invErr } = await supabase.from('invoices').select('*');
  if (invErr) {
    console.error("Error fetching invoices:", invErr);
  } else {
    console.log(`Found ${invoices.length} items in the invoices table.`);
    if (invoices.length > 0) {
        console.log(invoices.map(i => ({
            id: i.id,
            status: i.status,
            employee_id: i.employee_id,
            invoice_number: i.invoice_number
        })));
    }
  }
}

checkQueue()
