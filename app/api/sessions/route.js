import { pool } from '@/lib/db';
import { quote } from '@/lib/pricing';
import { requireRole, currentUser } from '@/lib/auth';
import { logEvent } from '@/lib/mongo';
import { NextResponse } from 'next/server';

export async function GET() {
  const u = await currentUser();
  if (u.role === 'Customer') {   // customers only see their own sessions (stored procedure)
    const [[c]] = await pool.query('SELECT customer_id FROM customers WHERE user_id=?', [u.id]);
    const [rows] = await pool.query('CALL GetCustomerSessions(?)', [c?.customer_id ?? 0]);
    return NextResponse.json(rows[0]);
  }
  const [rows] = await pool.query('SELECT * FROM session_billing_details ORDER BY session_id DESC LIMIT 100');
  return NextResponse.json(rows);
}

// Staff/Admin. action "start": lock PC, create Active session, mark PC In Use (one transaction).
// action "end": price the session, close it, free the PC, create the invoice (one transaction).
export async function POST(req) {
  const u = await requireRole('Admin', 'Staff');
  if (!u) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  const b = await req.json();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (b.action === 'start') {
      const [[pc]] = await conn.query('SELECT status FROM gaming_pcs WHERE pc_id=? FOR UPDATE', [b.pc_id]);
      if (!pc) throw new Error('PC not found');
      if (pc.status !== 'Available') throw new Error(`PC is ${pc.status}, not Available`);
      const [r] = await conn.query(
        `INSERT INTO gaming_sessions (reservation_id, customer_id, pc_id, start_time, status) VALUES (?,?,?,NOW(),'Active')`,
        [b.reservation_id || null, b.customer_id, b.pc_id]);
      await conn.query(`UPDATE gaming_pcs SET status='In Use' WHERE pc_id=?`, [b.pc_id]);
      await conn.commit();
      logEvent('session_started', u.id, { session_id: r.insertId, pc_id: b.pc_id });
      return NextResponse.json({ session_id: r.insertId, status: 'Active' });
    }
    if (b.action === 'end') {
      const [[s]] = await conn.query(`SELECT * FROM gaming_sessions WHERE session_id=? AND status='Active' FOR UPDATE`, [b.session_id]);
      if (!s) throw new Error('No active session with that id');
      const end = new Date();
      const q = await quote(conn, { pcId: s.pc_id, customerId: s.customer_id, start: s.start_time, end });
      await conn.query(
        `UPDATE gaming_sessions SET end_time=?, duration_minutes=?, pricing_rule_id=?, base_amount=?, discount_amount=?, final_amount=?, status='Completed' WHERE session_id=?`,
        [end, q.duration_minutes, q.pricing_rule_id, q.base_amount, q.discount_amount, q.final_amount, s.session_id]);
      await conn.query(`UPDATE gaming_pcs SET status='Available' WHERE pc_id=?`, [s.pc_id]);
      const tax = +(q.final_amount * 0.18).toFixed(2);
      const no = `INV-${end.toISOString().slice(0, 10).replaceAll('-', '')}-${String(s.session_id).padStart(5, '0')}`;
      await conn.query(
        `INSERT INTO invoices (session_id, invoice_no, invoice_date, amount, tax_amount, total_amount, status) VALUES (?,?,?,?,?,?,'Unpaid')`,
        [s.session_id, no, end, q.final_amount, tax, +(q.final_amount + tax).toFixed(2)]);
      await conn.commit();
      logEvent('session_ended', u.id, { session_id: s.session_id, ...q });
      return NextResponse.json({ session_id: s.session_id, invoice_no: no, ...q });
    }
    throw new Error('action must be start or end');
  } catch (e) {
    await conn.rollback();
    return NextResponse.json({ error: e.message }, { status: 400 });
  } finally { conn.release(); }
}
