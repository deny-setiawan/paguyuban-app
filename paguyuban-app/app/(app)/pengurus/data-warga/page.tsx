import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, profiles } from '@/lib/db/schema'
import { Users } from 'lucide-react'
import { eq } from 'drizzle-orm'
import DataWargaClient from './DataWargaClient'
import Link from 'next/link'

export default async function DataWargaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'admin'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select({
    warga,
    phone: profiles.phone,
    isActive: profiles.isActive,
    role: profiles.role,
  }).from(warga)
    .leftJoin(profiles, eq(warga.profileId, profiles.id))
    .where(eq(warga.rtGroupId, payload.rtGroupId!))
    .orderBy(warga.noRumah)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Users size={16} /> Data Warga ({list.length})</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <DataWargaClient items={list.map(r => ({
        id: r.warga.id,
        namaLengkap: r.warga.namaLengkap,
        nik: r.warga.nik,
        noRumah: r.warga.noRumah,
        noKk: r.warga.noKk,
        kkStatus: r.warga.kkStatus,
        hubunganKeluarga: r.warga.hubunganKeluarga,
        jenisKelamin: r.warga.jenisKelamin,
        tanggalLahir: r.warga.tanggalLahir,
        agama: r.warga.agama,
        pekerjaan: r.warga.pekerjaan,
        statusPerkawinan: r.warga.statusPerkawinan,
        statusHunian: r.warga.statusHunian,
        statusSosial: r.warga.statusSosial,
        status: r.warga.status,
        phone: r.phone,
        isActive: r.isActive,
      }))} />
    </>
  )
}
