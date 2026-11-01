// rate/hr = category base * time-of-day/day-type multiplier * demand multiplier; then membership discount.
export async function quote(conn, { pcId, customerId, start, end }) {
  const s = new Date(start), e = new Date(end);
  const mins = Math.round((e - s) / 60000);
  if (!(mins > 0)) throw new Error('End time must be after start time');
  const [[pc]] = await conn.query('SELECT category_id FROM gaming_pcs WHERE pc_id=?', [pcId]);
  if (!pc) throw new Error('PC not found');
  const day = [0, 6].includes(s.getDay()) ? 'Weekend' : 'Weekday';
  const t = s.toTimeString().slice(0, 8);
  const [[rule]] = await conn.query(
    `SELECT pricing_id, base_rate, time_multiplier FROM pricing_rules
     WHERE category_id=? AND day_type=? AND active=1 AND ? BETWEEN start_time AND end_time
     ORDER BY priority DESC LIMIT 1`, [pc.category_id, day, t]);
  if (!rule) throw new Error('No pricing rule for this slot');
  const [[u]] = await conn.query(
    `SELECT 100 * (SELECT COUNT(DISTINCT pc_id) FROM gaming_sessions WHERE start_time < ? AND end_time > ?)
            / (SELECT COUNT(*) FROM gaming_pcs) AS util`, [e, s]);
  const [[d]] = await conn.query(
    `SELECT demand_multiplier FROM demand_pricing WHERE active=1 AND ? BETWEEN min_utilization_percent AND max_utilization_percent LIMIT 1`, [u.util]);
  const demand = d?.demand_multiplier ?? 1;
  const base = +(rule.base_rate * rule.time_multiplier * demand * mins / 60).toFixed(2);
  let pct = 0;
  if (customerId) {
    const [[m]] = await conn.query(
      `SELECT mp.discount_percent FROM memberships m JOIN membership_plans mp ON mp.plan_id=m.plan_id
       WHERE m.customer_id=? AND m.status='Active' AND ? BETWEEN m.start_date AND m.end_date LIMIT 1`, [customerId, s]);
    pct = m?.discount_percent ?? 0;
  }
  const discount = +(base * pct / 100).toFixed(2);
  return { pricing_rule_id: rule.pricing_id, duration_minutes: mins, utilization: +u.util, demand_multiplier: demand,
           time_multiplier: rule.time_multiplier, base_amount: base, discount_amount: discount, final_amount: +(base - discount).toFixed(2) };
}
