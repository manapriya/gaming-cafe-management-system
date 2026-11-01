import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';
export async function GET() {
  const [rows] = await pool.query(
    `SELECT p.pc_id, p.pc_number, cat.category_name, p.status FROM gaming_pcs p
     JOIN pc_categories cat ON cat.category_id=p.category_id ORDER BY p.pc_id`);
  return NextResponse.json(rows);
}
