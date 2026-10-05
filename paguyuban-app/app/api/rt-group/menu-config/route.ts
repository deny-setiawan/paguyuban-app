import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

// Auto-migrate: tambah kolom menu_config jika belum ada
async function ensureColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE rt_groups ADD COLUMN IF NOT EXISTS menu_config jsonb
    `)
  } catch { /* kolom sudah ada */ }
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureColumn()
  const [rt] = await db.select({ menuConfig: rtGroups.menuConfig })
    .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId!)).limit(1)

  return NextResponse.json({ menuConfig: rt?.menuConfig ?? null })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { menuConfig } = await req.json()
  await ensureColumn()
  await db.update(rtGroups).set({ menuConfig }).where(eq(rtGroups.id, payload.rtGroupId!))
  return NextResponse.json({ ok: true })
}
