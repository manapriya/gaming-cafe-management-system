import { pool } from '@/lib/db';
import { quote } from '@/lib/pricing';
import { NextResponse } from 'next/server';
export async function POST(req) {
  try { return NextResponse.json(await quote(pool, await req.json())); }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
