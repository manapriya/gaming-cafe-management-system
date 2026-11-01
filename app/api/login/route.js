import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { sign } from '@/lib/auth';
import { logEvent } from '@/lib/mongo';
import { NextResponse } from 'next/server';
export async function POST(req) {
  const { email, password } = await req.json();
 const [[u]] = await pool.query(
  'SELECT user_id, name, password, role FROM users WHERE email=?',
  [email]
);
  if (!u || !(await bcrypt.compare(password ?? '', u.password))) {
    logEvent('login_failed', email);
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  }
  const res = NextResponse.json({ name: u.name, role: u.role });
  res.cookies.set('token', await sign({ id: u.user_id, name: u.name, role: u.role }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 28800 });
  logEvent('login', u.user_id, { role: u.role });
  return res;
}
