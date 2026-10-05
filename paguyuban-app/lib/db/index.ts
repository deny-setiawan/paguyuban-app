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
      } catch { /* already exists or other non-fatal error */ }
    })()
  }
  return _migrationPromise
}
