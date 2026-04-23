import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.PGPOOL_MAX,
});

export async function healthCheck(): Promise<boolean> {
  const r = await pool.query<{ ok: number }>('SELECT 1 AS ok');
  return r.rows[0]?.ok === 1;
}
