import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { wargaInvites, warga, profiles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const APPROVE_ROLES = ['ketua', 'admin']

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'bendahara', 'admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select().from(wargaInvites)
    .where(eq(wargaInvites.rtGroupId, payload.rtGroupId))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !APPROVE_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id dan action wajib' }, { status: 400 })

  const [invite] = await db.select().from(wargaInvites).where(eq(wargaInvites.id, id)).limit(1)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.update(wargaInvites).set({ status: 'disetujui' }).where(eq(wargaInvites.id, id))

    if (invite.profileId) {
      await db.update(profiles).set({ isActive: true }).where(eq(profiles.id, invite.profileId))
    }

    if (invite.profileId) {
      const existing = await db.select().from(warga).where(eq(warga.profileId, invite.profileId)).limit(1)
      if (existing.length === 0) {
        const dataKk = invite.dataKk as Record<string, string> | null
        await db.insert(warga).values({
          rtGroupId: invite.rtGroupId,
          profileId: invite.profileId,
          namaLengkap: invite.nama,
          noRumah: invite.noRumah || null,
          kkStatus: 'kepala_kk',
          statusHunian: dataKk?.hunian || null,
          statusPerkawinan: dataKk?.kawin || null,
          jenisKelamin: dataKk?.jk || null,
          agama: dataKk?.agama || null,
          pekerjaan: dataKk?.pekerjaan || null,
          tanggalLahir: dataKk?.tgl || null,
          alamatLengkap: dataKk?.alamat || null,
        })

        const anggota = invite.anggota as Array<Record<string, string>> | null
        if (Array.isArray(anggota)) {
          for (const a of anggota) {
            await db.insert(warga).values({
              rtGroupId: invite.rtGroupId,
              namaLengkap: a.nama || '',
              hubunganKeluarga: a.hubungan || null,
              tanggalLahir: a.tgl || null,
              jenisKelamin: a.jk || null,
              agama: a.agama || null,
              pekerjaan: a.pekerjaan || null,
              kkStatus: 'anggota',
              noRumah: invite.noRumah || null,
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true, action: 'approved' })
  }

  if (action === 'reject') {
    await db.update(wargaInvites).set({ status: 'ditolak' }).where(eq(wargaInvites.id, id))
    return NextResponse.json({ ok: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
