import { pool } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { NextResponse } from 'next/server';
export async function GET() {
  if (!(await requireRole('Admin'))) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const [byCat] = await pool.query(
    `SELECT cat.category_name, COUNT(s.session_id) AS sessions, SUM(s.final_amount) AS revenue
     FROM gaming_sessions s JOIN gaming_pcs p ON p.pc_id=s.pc_id JOIN pc_categories cat ON cat.category_id=p.category_id
     GROUP BY cat.category_name`);
  const [loyal] = await pool.query(
    `SELECT c.name, COUNT(*) AS sessions, SUM(s.final_amount) AS spent FROM gaming_sessions s
     JOIN customers c ON c.customer_id=s.customer_id GROUP BY c.customer_id, c.name HAVING COUNT(*) > 1 ORDER BY spent DESC`);
  const [unpaid] = await pool.query(
    `SELECT invoice_no, total_amount, status FROM invoices WHERE status <> 'Paid' ORDER BY invoice_date DESC`);
  return NextResponse.json({ byCat, loyal, unpaid });
}
