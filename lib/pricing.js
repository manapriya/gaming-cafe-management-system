// Dynamic pricing:
// Hourly rate × time multiplier × demand multiplier
// Then apply the customer's membership discount.

export async function quote(conn, { pcId, customerId, start, end }) {
  const s = new Date(start);
  const e = new Date(end);

  const mins = Math.round((e - s) / 60000);

  if (!(mins > 0)) {
    throw new Error('End time must be after start time');
  }

  // Get PC category
  const [[pc]] = await conn.query(
    'SELECT category_id FROM gaming_pcs WHERE pc_id = ?',
    [pcId]
  );

  if (!pc) {
    throw new Error('PC not found');
  }

  // Automatically identify weekday or weekend
  const day = [0, 6].includes(s.getDay()) ? 'Weekend' : 'Weekday';

  const t = s.toTimeString().slice(0, 8);

  // Get applicable pricing rule
  const [[rule]] = await conn.query(
    `SELECT pricing_id, base_rate, time_multiplier
     FROM pricing_rules
     WHERE category_id = ?
       AND day_type = ?
       AND active = 1
       AND ? BETWEEN start_time AND end_time
     ORDER BY priority DESC
     LIMIT 1`,
    [pc.category_id, day, t]
  );

  if (!rule) {
    throw new Error('No pricing rule for this slot');
  }

  // Calculate PC utilisation
  const [[u]] = await conn.query(
    `SELECT
       100 * (
         SELECT COUNT(DISTINCT pc_id)
         FROM gaming_sessions
         WHERE start_time < ?
           AND end_time > ?
       ) / (
         SELECT COUNT(*)
         FROM gaming_pcs
       ) AS util`,
    [e, s]
  );

  // Get demand multiplier
  const [[d]] = await conn.query(
    `SELECT demand_multiplier
     FROM demand_pricing
     WHERE active = 1
       AND ? BETWEEN min_utilization_percent
                 AND max_utilization_percent
     LIMIT 1`,
    [u.util]
  );

  const demand = d?.demand_multiplier ?? 1;

  // Calculate amount before membership discount
  const base = +(
    rule.base_rate *
    rule.time_multiplier *
    demand *
    mins / 60
  ).toFixed(2);

  // Get customer's active membership
  let pct = 0;
  let membershipName = 'No active membership';

  if (customerId) {
    const [[m]] = await conn.query(
      `SELECT
         mp.plan_name,
         mp.discount_percent
       FROM memberships m
       JOIN membership_plans mp
         ON mp.plan_id = m.plan_id
       WHERE m.customer_id = ?
         AND m.status = 'Active'
         AND ? BETWEEN m.start_date AND m.end_date
       LIMIT 1`,
      [customerId, s]
    );

    if (m) {
      pct = Number(m.discount_percent);
      membershipName = m.plan_name;
    }
  }

  // Calculate membership discount
  const discount = +(base * pct / 100).toFixed(2);

  const finalAmount = +(base - discount).toFixed(2);

  return {
    pricing_rule_id: rule.pricing_id,

    day_type: day,

    base_rate: Number(rule.base_rate),

    duration_minutes: mins,

    utilization: +Number(u.util).toFixed(2),

    demand_multiplier: Number(demand),

    time_multiplier: Number(rule.time_multiplier),

    membership_name: membershipName,

    membership_discount_percent: pct,

    base_amount: base,

    discount_amount: discount,

    final_amount: finalAmount
  };
}