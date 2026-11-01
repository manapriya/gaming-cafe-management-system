import { NextResponse } from 'next/server';
import { verify } from './lib/auth';
export async function middleware(req) {
  const p = await verify(req.cookies.get('token')?.value ?? '');
  if (!p) return req.nextUrl.pathname.startsWith('/api')
    ? NextResponse.json({ error: 'Login required' }, { status: 401 })
    : NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/dashboard/:path*', '/api/quote', '/api/sessions', '/api/reports', '/api/payments', '/api/games', '/api/pcs'] };
