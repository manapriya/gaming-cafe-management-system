import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';
// Full-text search over game name/genre/publisher, with where each game is installed.
export async function GET(req) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json([]);
  const [rows] = await pool.query(
    `SELECT g.game_name, g.genre, g.publisher, GROUP_CONCAT(p.pc_number ORDER BY p.pc_number) AS installed_on
     FROM games g LEFT JOIN pc_games pg ON pg.game_id=g.game_id LEFT JOIN gaming_pcs p ON p.pc_id=pg.pc_id
     WHERE MATCH(g.game_name, g.genre, g.publisher) AGAINST (? IN NATURAL LANGUAGE MODE)
     GROUP BY g.game_id`, [q]);
  return NextResponse.json(rows);
}
