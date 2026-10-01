import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, warga } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ProfilClient from './ProfilClient'

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
        jenisKelamin: wargaData.jenisKelamin,
        agama: wargaData.agama,
        pekerjaan: wargaData.pekerjaan,
        statusPerkawinan: wargaData.statusPerkawinan,
        statusHunian: wargaData.statusHunian,
        jumlahJiwa: wargaData.jumlahJiwa,
        alamatLengkap: wargaData.alamatLengkap,
      } : null}
      rtName={rt?.namaRt || 'Paguyuban PKR-Pepe'}
    />
  )
}
