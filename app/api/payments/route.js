
import { pool } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logEvent } from '@/lib/mongo';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const u = await requireRole('Admin', 'Staff');

  if (!u) {
    return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  }

  const b = await req.json();

  try {
    // Accept either numeric invoice ID or invoice number.
    const [[invoice]] = await pool.query(
      `SELECT invoice_id, invoice_no
       FROM invoices
       WHERE invoice_no = ? OR invoice_id = ?
       LIMIT 1`,
      [String(b.invoice_id ?? ''), 
       /^\d+$/.test(String(b.invoice_id ?? '')) ? Number(b.invoice_id) : -1]
    );

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await pool.query(
      `INSERT INTO payments
       (invoice_id, amount_paid, payment_mode, transaction_ref, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        invoice.invoice_id,
        b.amount_paid,
        b.payment_mode,
        b.transaction_ref || null,
        'Success'
      ]
    );

    const [[updated]] = await pool.query(
      'SELECT invoice_no, status FROM invoices WHERE invoice_id = ?',
      [invoice.invoice_id]
    );

    logEvent('payment', u.id, {
      invoice_id: invoice.invoice_id,
      amount: b.amount_paid
    });

    return NextResponse.json(updated);

  } catch (e) {
    return NextResponse.json(
      { error: e.sqlMessage || e.message },
      { status: 400 }
    );
  }
}
