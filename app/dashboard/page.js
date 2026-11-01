'use client';
import { useEffect, useState } from 'react';
const Table = ({ rows }) => !rows?.length ? <p className="mute">Nothing here yet.</p> : (
  <div className="wrap"><table><thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
  <tbody>{rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>)}</tbody></table></div>);
const post = (u, b) => fetch(u, { method: 'POST', body: JSON.stringify(b) }).then(r => r.json());
const sql = v => v.replace('T', ' ') + ':00';
const vals = f => Object.fromEntries(new FormData(f));

export default function Dashboard() {
  const [sessions, setSessions] = useState([]), [pcs, setPcs] = useState([]), [reports, setReports] = useState(null);
  const [out, setOut] = useState(null), [q, setQ] = useState(''), [games, setGames] = useState([]);
  const load = () => {
    fetch('/api/sessions').then(r => r.json()).then(setSessions);
    fetch('/api/pcs').then(r => r.json()).then(setPcs);
    fetch('/api/reports').then(r => r.ok ? r.json() : null).then(setReports);
  };
  useEffect(load, []);
  const shown = Array.isArray(sessions) ? sessions.filter(s => JSON.stringify(s).toLowerCase().includes(q.toLowerCase())) : [];
  const act = async (url, body) => { setOut(await post(url, body)); load(); };
  return (<>
    <h1>Sessions and pricing</h1>
    <h2>PC status</h2><Table rows={pcs} />

    <h2>Price a session</h2>
    <form onSubmit={async e => { e.preventDefault(); const f = vals(e.currentTarget); setOut(await post('/api/quote', { pcId: f.pc_id, customerId: f.customer_id, start: sql(f.start), end: sql(f.end) })); }}>
      <label>PC id<input name="pc_id" type="number" required /></label>
      <label>Customer id<input name="customer_id" type="number" /></label>
      <label>Start<input name="start" type="datetime-local" required /></label>
      <label>End<input name="end" type="datetime-local" required /></label>
      <button>Get price</button>
    </form>

    <h2>Run a session (staff)</h2>
    <form onSubmit={e => { e.preventDefault(); const f = vals(e.currentTarget); act('/api/sessions', { action: 'start', pc_id: f.pc_id, customer_id: f.customer_id }); }}>
      <label>PC id<input name="pc_id" type="number" required /></label>
      <label>Customer id<input name="customer_id" type="number" required /></label>
      <button>Start session</button>
    </form>
    <form onSubmit={e => { e.preventDefault(); act('/api/sessions', { action: 'end', session_id: vals(e.currentTarget).session_id }); }}>
      <label>Session id<input name="session_id" type="number" required /></label>
      <button>End session and invoice</button>
    </form>

    <h2>Take a payment (staff)</h2>
    <form onSubmit={e => { e.preventDefault(); act('/api/payments', vals(e.currentTarget)); }}>
      <label>Invoice number
  <input
    name="invoice_id"
    type="text"
    placeholder="INV-20261101-00001"
    required
  />
</label>
      <label>Amount<input name="amount_paid" type="number" step="0.01" required /></label>
      <label>Mode<select name="payment_mode"><option>Cash</option><option>Card</option><option>UPI</option><option>Wallet</option></select></label>
      <button>Record payment</button>
    </form>
    {out && <pre role="status">{JSON.stringify(out, null, 2)}</pre>}

    <h2>Find a game</h2>
    <form onSubmit={async e => { e.preventDefault(); setGames(await fetch('/api/games?q=' + encodeURIComponent(vals(e.currentTarget).g)).then(r => r.json())); }}>
      <label>Name, genre or publisher<input name="g" required /></label><button>Search</button>
    </form>
    {games.length > 0 && <Table rows={games} />}

    <h2>Sessions</h2>
    <input placeholder="Filter by customer, PC or status" value={q} onChange={e => setQ(e.target.value)} aria-label="Filter sessions" />
    <Table rows={shown} />
    {reports && <><h2>Revenue by PC category</h2><Table rows={reports.byCat} />
      <h2>Repeat customers</h2><Table rows={reports.loyal} /><h2>Open invoices</h2><Table rows={reports.unpaid} /></>}
  </>);
}
