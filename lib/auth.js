import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export const sign = (p) => new SignJWT(p).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(key());
export async function verify(t) { try { return (await jwtVerify(t, key())).payload; } catch { return null; } }
export async function currentUser() { const t = cookies().get('token')?.value; return t ? verify(t) : null; }
export async function requireRole(...roles) {
  const u = await currentUser();
  if (!u || (roles.length && !roles.includes(u.role))) return null;
  return u;
}
