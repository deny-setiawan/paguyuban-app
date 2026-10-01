import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { laporanWarga } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const TANGGAP_ROLES = ['ketua', 'sekretaris', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !TANGGAP_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { tanggapan, status } = await req.json()

  await db.update(laporanWarga).set({
    ...(tanggapan !== undefined && { tanggapan }),
    ...(status && { status }),
    tanggapiOleh: payload.sub,
  }).where(and(eq(laporanWarga.id, id), eq(laporanWarga.rtGroupId, payload.rtGroupId!)))

  return NextResponse.json({ ok: true })
}
