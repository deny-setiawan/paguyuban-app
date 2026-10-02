import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const body = await req.json()
  const allowed = ['namaRt', 'rtNumber', 'rwNumber', 'kelurahan', 'kecamatan', 'kota',
    'provinsi', 'namaJalan', 'noRekening', 'bankNama', 'bankAtasNama',
    'ketuaNama', 'logoUrl', 'temaWarna', 'pemutakhiranActive', 'pemutakhiranTahun']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  await db.update(rtGroups).set(updates).where(eq(rtGroups.id, payload.rtGroupId))
  return NextResponse.json({ ok: true })
}
