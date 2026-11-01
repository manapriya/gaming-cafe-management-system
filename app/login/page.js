'use client';
import { useState } from 'react';
export default function Login() {
  const [err, setErr] = useState('');
  async function go(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(f)) });
    if (r.ok) location.href = '/dashboard'; else setErr((await r.json()).error);
  }
  return (<>
    <h1>Sign in</h1><p className="mute">Staff, admins and customers use the same login.</p>
    <form onSubmit={go}>
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required /></label>
      <button>Sign in</button>
    </form>
    {err && <p className="err" role="alert">{err}</p>}
  </>);
}
