import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { WaNotifConfig } from '@/lib/wa-client'
import { DEFAULT_NOTIF_CONFIG } from '@/lib/wa-client'

async function getAdminPayload() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return null
  return payload
}

export async function GET() {
  const payload = await getAdminPayload()
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const [rt] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
    .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId)).limit(1)

  const config: WaNotifConfig = { ...DEFAULT_NOTIF_CONFIG, ...(rt?.waNotifConfig as WaNotifConfig | null ?? {}) }
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  const payload = await getAdminPayload()
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const body = await req.json()
  const allowed = ['wargaDiterima', 'laporanUpdate', 'suratUpdate', 'inventarisSewa', 'groupLaporan'] as const
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  const [rt] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
    .from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId)).limit(1)

  const current = (rt?.waNotifConfig as WaNotifConfig) ?? {}
  const merged: WaNotifConfig = { ...current, ...(updates as Partial<WaNotifConfig>) }

  await db.update(rtGroups).set({ waNotifConfig: merged }).where(eq(rtGroups.id, payload.rtGroupId))
  return NextResponse.json({ ok: true })
}
