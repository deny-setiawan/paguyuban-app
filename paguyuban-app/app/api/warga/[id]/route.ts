import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, profiles } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const ADMIN_ROLES = ['ketua', 'sekretaris', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !ADMIN_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const wargaFields = ['namaLengkap', 'nik', 'noKk', 'noRumah', 'tanggalLahir', 'jenisKelamin',
    'agama', 'pekerjaan', 'statusPerkawinan', 'statusHunian', 'hubunganKeluarga',
    'statusSosial', 'alamatLengkap', 'status', 'jumlahJiwa']
  const updates: Record<string, unknown> = {}
  for (const k of wargaFields) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  await db.update(warga).set(updates).where(and(eq(warga.id, id), eq(warga.rtGroupId, payload.rtGroupId!)))

  // Also update linked profile if name changed
  if (body.namaLengkap || body.isActive !== undefined) {
    const [w] = await db.select().from(warga).where(eq(warga.id, id)).limit(1)
    if (w?.profileId) {
      const profileUpdates: Record<string, unknown> = {}
      if (body.namaLengkap) profileUpdates.fullName = body.namaLengkap
      if (body.isActive !== undefined) profileUpdates.isActive = body.isActive
      if (Object.keys(profileUpdates).length > 0) {
        await db.update(profiles).set(profileUpdates).where(eq(profiles.id, w.profileId))
      }
    }
  }

  return NextResponse.json({ ok: true })
}
