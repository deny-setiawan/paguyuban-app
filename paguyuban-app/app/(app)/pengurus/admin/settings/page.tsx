import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { rtGroups } from '@/lib/db/schema'
import { Settings } from 'lucide-react'
import { eq } from 'drizzle-orm'
import AdminSettingsClient from './AdminSettingsClient'
import Link from 'next/link'

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') redirect('/pengurus')

  const [rt] = await db.select().from(rtGroups).where(eq(rtGroups.id, payload.rtGroupId!)).limit(1)
  if (!rt) redirect('/pengurus')

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Settings size={16} /> Pengaturan RT</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <AdminSettingsClient rt={{
        id: rt.id,
        namaRt: rt.namaRt,
        rtNumber: rt.rtNumber,
        rwNumber: rt.rwNumber,
        kelurahan: rt.kelurahan,
        kecamatan: rt.kecamatan,
        kota: rt.kota,
        provinsi: rt.provinsi,
        namaJalan: rt.namaJalan,
        noRekening: rt.noRekening,
        bankNama: rt.bankNama,
        bankAtasNama: rt.bankAtasNama,
        ketuaNama: rt.ketuaNama,
        temaWarna: rt.temaWarna,
        pemutakhiranActive: rt.pemutakhiranActive ?? false,
        pemutakhiranTahun: rt.pemutakhiranTahun ?? null,
      }} />
    </>
  )
}
