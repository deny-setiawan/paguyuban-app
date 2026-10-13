import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'kordinator', 'admin']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { noRumah, namaLengkap, jenisKelamin, hubunganKeluarga } = await req.json()

  if (!noRumah || !namaLengkap?.trim() || !jenisKelamin || !hubunganKeluarga) {
    return NextResponse.json({ error: 'Nama, jenis kelamin, dan hubungan keluarga wajib diisi' }, { status: 400 })
  }

  const [kepala] = await db.select({ noKk: warga.noKk }).from(warga)
    .where(and(eq(warga.noRumah, noRumah), eq(warga.rtGroupId, payload.rtGroupId!), eq(warga.kkStatus, 'kepala_kk')))
    .limit(1)

  const [newWarga] = await db.insert(warga).values({
    rtGroupId: payload.rtGroupId!,
    noRumah,
    namaLengkap: namaLengkap.trim(),
    jenisKelamin,
    hubunganKeluarga,
    kkStatus: 'anggota',
    noKk: kepala?.noKk ?? null,
    status: 'aktif',
  }).returning()

  return NextResponse.json({
    ok: true,
    warga: {
      id: newWarga.id,
      source: 'warga' as const,
      namaLengkap: newWarga.namaLengkap,
      nik: newWarga.nik,
      noRumah: newWarga.noRumah,
      noKk: newWarga.noKk,
      kkStatus: newWarga.kkStatus,
      hubunganKeluarga: newWarga.hubunganKeluarga,
      jenisKelamin: newWarga.jenisKelamin,
      tanggalLahir: newWarga.tanggalLahir,
      agama: newWarga.agama,
      statusPerkawinan: newWarga.statusPerkawinan,
      statusHunian: newWarga.statusHunian,
      tanggalMenempati: newWarga.tanggalMenempati,
      pekerjaan: newWarga.pekerjaan,
      statusSosial: newWarga.statusSosial,
      status: newWarga.status,
      phone: null,
      isActive: null,
      role: null,
      fotoFiles: null,
    },
  })
}
