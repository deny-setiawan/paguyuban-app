import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, profiles, wargaInvites } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const ADMIN_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'admin']

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !ADMIN_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Find the warga record to get noRumah and rtGroupId
  const [target] = await db.select().from(warga)
    .where(and(eq(warga.id, id), eq(warga.rtGroupId, payload.rtGroupId!)))
    .limit(1)

  if (!target) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  // Collect all warga in same household to clean up invites
  const allInHousehold = await db.select().from(warga)
    .where(and(eq(warga.noRumah, target.noRumah!), eq(warga.rtGroupId, payload.rtGroupId!)))

  // Delete related wargaInvites for each profile in this KK
  for (const w of allInHousehold) {
    if (w.profileId) {
      await db.delete(wargaInvites).where(eq(wargaInvites.profileId, w.profileId))
    }
  }

  // Delete all warga in this household
  if (target.noRumah) {
    await db.delete(warga).where(and(eq(warga.noRumah, target.noRumah), eq(warga.rtGroupId, payload.rtGroupId!)))
  } else {
    await db.delete(warga).where(and(eq(warga.id, id), eq(warga.rtGroupId, payload.rtGroupId!)))
  }

  return NextResponse.json({ ok: true })
}
