import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Lazy singleton — tidak connect saat build time
let _db: NeonHttpDatabase<typeof schema> | null = null

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    _db = drizzle(neon(process.env.DATABASE_URL), { schema })
  }
  return _db
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  { get: (_, prop) => (getDb() as unknown as Record<string | symbol, unknown>)[prop] }
)

let _migrationPromise: Promise<void> | null = null

export function ensureMigrations(): Promise<void> {
  if (!_migrationPromise) {
    _migrationPromise = (async () => {
      try {
        await getDb().execute(sql`ALTER TABLE rt_groups ADD COLUMN IF NOT EXISTS menu_config jsonb`)
      } catch { }
      try {
        await getDb().execute(sql`ALTER TABLE rt_groups ADD COLUMN IF NOT EXISTS wa_notif_config jsonb`)
      } catch { }
      try {
        await getDb().execute(sql`
          CREATE TABLE IF NOT EXISTS dana_sosial_history (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            rt_group_id uuid NOT NULL,
            warga_id uuid,
            nama_warga varchar(150),
            no_rumah varchar(20),
            jenis varchar(20) NOT NULL,
            tahun integer NOT NULL,
            catatan text,
            created_at timestamp DEFAULT NOW(),
            created_by_profile_id uuid,
            created_by_name varchar(150)
          )
        `)
      } catch { }
    })()
  }
  return _migrationPromise
}
