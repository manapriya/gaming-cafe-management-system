'use client';

import { useEffect, useState } from 'react';

const Table = ({ rows }) =>
  !rows?.length ? (
    <p className="mute">Nothing here yet.</p>
  ) : (
    <div className="wrap">
      <table>
        <thead>
          <tr>
            {Object.keys(rows[0]).map(k => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {Object.values(r).map((v, j) => (
                <td key={j}>{String(v ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const post = (u, b) =>
  fetch(u, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(b)
  }).then(async r => {
    const data = await r.json();

    if (!r.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  });

const sql = v => v.replace('T', ' ') + ':00';

const vals = f => Object.fromEntries(new FormData(f));

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [reports, setReports] = useState(null);

  const [out, setOut] = useState(null);
  const [quoteResult, setQuoteResult] = useState(null);
  const [quoteError, setQuoteError] = useState('');

  const [q, setQ] = useState('');
  const [games, setGames] = useState([]);

  const load = () => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(setSessions);

    fetch('/api/pcs')
      .then(r => r.json())
      .then(setPcs);

    fetch('/api/reports')
      .then(r => r.ok ? r.json() : null)
      .then(setReports);
  };

  useEffect(() => {
    load();
  }, []);

  const shown = Array.isArray(sessions)
    ? sessions.filter(s =>
        JSON.stringify(s).toLowerCase().includes(q.toLowerCase())
      )
    : [];

  const act = async (url, body) => {
    try {
      setOut(await post(url, body));
      load();
    } catch (e) {
      setOut({ error: e.message });
    }
  };

  // Calculate session price
  const calculateQuote = async e => {
    e.preventDefault();

    const f = vals(e.currentTarget);

    setQuoteResult(null);
    setQuoteError('');

    try {
      const result = await post('/api/quote', {
        pcId: f.pc_id,
        customerId: f.customer_id || null,
        start: sql(f.start),
        end: sql(f.end)
      });

      setQuoteResult(result);
    } catch (e) {
      setQuoteError(e.message);
    }
  };

  return (
    <>
      <h1>Sessions and pricing</h1>

      {/* PC STATUS */}
      <h2>PC status</h2>
      <Table rows={pcs} />

      {/* SESSION PRICE CALCULATOR */}
      <h2>Price a session</h2>

      <form onSubmit={calculateQuote}>
        <label>
          PC id
          <input
            name="pc_id"
            type="number"
            required
          />
        </label>

        <label>
          Customer id
          <input
            name="customer_id"
            type="number"
            placeholder="Enter customer ID"
          />
        </label>

        <label>
          Start
          <input
            name="start"
            type="datetime-local"
            required
          />
        </label>

        <label>
          End
          <input
            name="end"
            type="datetime-local"
            required
          />
        </label>

        <button type="submit">
          Get price
        </button>
      </form>

      {/* PRICING BREAKDOWN */}
      {quoteError && (
        <p role="alert">
          Error: {quoteError}
        </p>
      )}

      {quoteResult && (
        <section className="price-breakdown">
          <h2>Dynamic pricing breakdown</h2>

          <table>
            <tbody>
              <tr>
                <th>Day type</th>
                <td>{quoteResult.day_type}</td>
              </tr>

              <tr>
                <th>Base hourly rate</th>
                <td>₹{quoteResult.base_rate}</td>
              </tr>

              <tr>
                <th>Duration</th>
                <td>
                  {quoteResult.duration_minutes} minutes
                </td>
              </tr>

              <tr>
                <th>Time multiplier</th>
                <td>
                  {quoteResult.time_multiplier}x
                </td>
              </tr>

              <tr>
                <th>PC utilisation</th>
                <td>
                  {quoteResult.utilization}%
                </td>
              </tr>

              <tr>
                <th>Demand multiplier</th>
                <td>
                  {quoteResult.demand_multiplier}x
                </td>
              </tr>

              <tr>
                <th>Membership plan</th>
                <td>
                  {quoteResult.membership_name}
                </td>
              </tr>

              <tr>
                <th>Membership discount</th>
                <td>
                  {quoteResult.membership_discount_percent}%
                </td>
              </tr>

              <tr>
                <th>Amount before discount</th>
                <td>
                  ₹{quoteResult.base_amount}
                </td>
              </tr>

              <tr>
                <th>Discount amount</th>
                <td>
                  -₹{quoteResult.discount_amount}
                </td>
              </tr>

              <tr>
                <th>Final price</th>
                <td>
                  <strong>
                    ₹{quoteResult.final_amount}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* START AND END SESSION */}
      <h2>Run a session (staff)</h2>

      <form onSubmit={e => {
        e.preventDefault();

        const f = vals(e.currentTarget);

        act('/api/sessions', {
          action: 'start',
          pc_id: f.pc_id,
          customer_id: f.customer_id
        });
      }}>
        <label>
          PC id
          <input
            name="pc_id"
            type="number"
            required
          />
        </label>

        <label>
          Customer id
          <input
            name="customer_id"
            type="number"
            required
          />
        </label>

        <button type="submit">
          Start session
        </button>
      </form>

      <form onSubmit={e => {
        e.preventDefault();

        act('/api/sessions', {
          action: 'end',
          session_id: vals(e.currentTarget).session_id
        });
      }}>
        <label>
          Session id
          <input
            name="session_id"
            type="number"
            required
          />
        </label>

        <button type="submit">
          End session and invoice
        </button>
      </form>

      {/* PAYMENT */}
      <h2>Take a payment (staff)</h2>

      <form onSubmit={e => {
        e.preventDefault();

        act('/api/payments', vals(e.currentTarget));
      }}>
        <label>
          Invoice number
          <input
            name="invoice_id"
            type="text"
            placeholder="INV-20261101-00001"
            required
          />
        </label>

        <label>
          Amount
          <input
            name="amount_paid"
            type="number"
            step="0.01"
            required
          />
        </label>

        <label>
          Mode
          <select name="payment_mode">
            <option>Cash</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Wallet</option>
          </select>
        </label>

        <button type="submit">
          Record payment
        </button>
      </form>

      {out && (
        <pre role="status">
          {JSON.stringify(out, null, 2)}
        </pre>
      )}

      {/* GAME SEARCH */}
      <h2>Find a game</h2>

      <form onSubmit={async e => {
        e.preventDefault();

        const f = vals(e.currentTarget);

        const result = await fetch(
          '/api/games?q=' + encodeURIComponent(f.g)
        ).then(r => r.json());

        setGames(result);
      }}>
        <label>
          Name, genre or publisher
          <input name="g" required />
        </label>

        <button type="submit">
          Search
        </button>
      </form>

      {games.length > 0 && (
        <Table rows={games} />
      )}

      {/* SESSION HISTORY */}
      <h2>Sessions</h2>

      <input
        placeholder="Filter by customer, PC or status"
        value={q}
        onChange={e => setQ(e.target.value)}
        aria-label="Filter sessions"
      />

      <Table rows={shown} />

      {/* REPORTS */}
      {reports && (
        <>
          <h2>Revenue by PC category</h2>
          <Table rows={reports.byCat} />

          <h2>Repeat customers</h2>
          <Table rows={reports.loyal} />

          <h2>Open invoices</h2>
          <Table rows={reports.unpaid} />
        </>
      )}
    </>
  );
}