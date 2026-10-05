import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, warga, rtGroups, wargaInvites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import KeluargaClient from './KeluargaClient'

export default async function KeluargaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const [rt] = profile.rtGroupId
    ? await db.select({ namaRt: rtGroups.namaRt }).from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    : []
  const rtName = rt?.namaRt || 'Paguyuban PKR-Pepe'

  const [kepalaKk] = await db.select().from(warga)
    .where(eq(warga.profileId, profile.id)).limit(1)

  const allAnggota = kepalaKk?.noKk
    ? await db.select().from(warga).where(eq(warga.noKk, kepalaKk.noKk))
    : kepalaKk?.noRumah
      ? await db.select().from(warga).where(eq(warga.noRumah, kepalaKk.noRumah))
      : kepalaKk ? [kepalaKk] : []

  // Foto dokumen dari wargaInvites
  let fotoFiles: string[] = []
  if (kepalaKk?.noRumah || profile.id) {
    const invites = await db.select({ fotoFiles: wargaInvites.fotoFiles })
      .from(wargaInvites)
      .where(kepalaKk?.noRumah
        ? eq(wargaInvites.noRumah, kepalaKk.noRumah!)
        : eq(wargaInvites.profileId, profile.id)
      ).limit(5)
    fotoFiles = invites.flatMap(inv =>
      Array.isArray(inv.fotoFiles) ? (inv.fotoFiles as string[]) : []
    )
  }

  const kepalaData = kepalaKk ? {
    id: kepalaKk.id,
    namaLengkap: kepalaKk.namaLengkap,
    nik: kepalaKk.nik,
    noKk: kepalaKk.noKk,
    noRumah: kepalaKk.noRumah,
    jenisKelamin: kepalaKk.jenisKelamin,
    agama: kepalaKk.agama,
    statusPerkawinan: kepalaKk.statusPerkawinan,
    pekerjaan: kepalaKk.pekerjaan,
    statusHunian: kepalaKk.statusHunian,
    tanggalMenempati: kepalaKk.tanggalMenempati,
    tanggalLahir: kepalaKk.tanggalLahir,
    jumlahJiwa: kepalaKk.jumlahJiwa,
    hubunganKeluarga: kepalaKk.hubunganKeluarga,
    kkStatus: kepalaKk.kkStatus,
    profileId: kepalaKk.profileId,
  } : null

  const anggotaData = allAnggota.map(a => ({
    id: a.id,
    namaLengkap: a.namaLengkap,
    nik: a.nik,
    noKk: a.noKk,
    noRumah: a.noRumah,
    jenisKelamin: a.jenisKelamin,
    agama: a.agama,
    statusPerkawinan: a.statusPerkawinan,
    pekerjaan: a.pekerjaan,
    statusHunian: a.statusHunian,
    tanggalMenempati: a.tanggalMenempati,
    tanggalLahir: a.tanggalLahir,
    jumlahJiwa: a.jumlahJiwa,
    hubunganKeluarga: a.hubunganKeluarga,
    kkStatus: a.kkStatus,
    profileId: a.profileId,
  }))

  return (
    <KeluargaClient
      profileId={profile.id}
      kepalaKk={kepalaData}
      allAnggota={anggotaData}
      phone={profile.phone}
      fotoFiles={fotoFiles}
      rtName={rtName}
    />
  )
}
