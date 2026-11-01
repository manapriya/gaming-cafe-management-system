import { MongoClient } from 'mongodb';
const g = globalThis;
const client = g._mongo ?? (g._mongo = new MongoClient(process.env.MONGODB_URI));
// Activity/audit log lives in MongoDB: schema-less, write-heavy, never joined.
export async function logs() { await client.connect(); return client.db(process.env.MONGODB_DB).collection('activity_logs'); }
export async function logEvent(type, user, payload = {}) {
  try { (await logs()).insertOne({ type, user, payload, at: new Date() }); } catch (e) { console.error('mongo log failed', e.message); }
}
