import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, warga, wargaInvites } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import ProfilClient from './ProfilClient'
import type { Warga as WargaType } from '@/lib/db/schema'

export default async function ProfilPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData ?? null
  }

  const [wargaData] = await db.select().from(warga).where(eq(warga.profileId, profile.id)).limit(1)

  // Anggota keluarga: by noKK if available, else by noRumah
  let anggotaList: WargaType[] = []
  if (wargaData?.noKk) {
    anggotaList = await db.select().from(warga).where(eq(warga.noKk, wargaData.noKk))
  } else if (wargaData?.noRumah) {
    anggotaList = await db.select().from(warga).where(eq(warga.noRumah, wargaData.noRumah))
  }

  // Get foto from latest wargaInvite for this profile
  const [latestInvite] = await db.select({ fotoFiles: wargaInvites.fotoFiles })
    .from(wargaInvites)
    .where(eq(wargaInvites.profileId, profile.id))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(1)
  const fotoFiles = Array.isArray(latestInvite?.fotoFiles) ? (latestInvite.fotoFiles as string[]) : []

  return (
    <ProfilClient
      profile={{
        id: profile.id,
        phone: profile.phone,
        fullName: profile.fullName,
        noRumah: profile.noRumah,
        email: profile.email,
        role: profile.role,
        isActive: profile.isActive,
        isVerified: profile.isVerified,
      }}
      warga={wargaData ? {
        id: wargaData.id,
        namaLengkap: wargaData.namaLengkap,
        nik: wargaData.nik,
        noKk: wargaData.noKk,
        tanggalLahir: wargaData.tanggalLahir,
        tanggalMenempati: wargaData.tanggalMenempati,
        jenisKelamin: wargaData.jenisKelamin,
        agama: wargaData.agama,
        pekerjaan: wargaData.pekerjaan,
        statusPerkawinan: wargaData.statusPerkawinan,
        statusHunian: wargaData.statusHunian,
        jumlahJiwa: wargaData.jumlahJiwa,
        alamatLengkap: wargaData.alamatLengkap,
        dansosKelahiranTerpakai: wargaData.dansosKelahiranTerpakai,
        dansosSakitTerpakai: wargaData.dansosSakitTerpakai,
      } : null}
      anggota={anggotaList
        .filter(a => a.id !== wargaData?.id)
        .map(a => ({ id: a.id, namaLengkap: a.namaLengkap, hubunganKeluarga: a.hubunganKeluarga, jenisKelamin: a.jenisKelamin, agama: a.agama, kkStatus: a.kkStatus }))}
      rtName={rt?.namaRt || 'Paguyuban PKR-Pepe'}
      fotoFiles={fotoFiles}
    />
  )
}
