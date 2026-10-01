import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { laporanWarga, profiles } from '@/lib/db/schema'
import { and, eq, inArray, desc } from 'drizzle-orm'
import LaporanMasukClient from './LaporanMasukClient'
import Link from 'next/link'

export default async function LaporanMasukPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'admin'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select({
    laporan: laporanWarga,
    nama: profiles.fullName,
    phone: profiles.phone,
  }).from(laporanWarga)
    .leftJoin(profiles, eq(laporanWarga.pelaporId, profiles.id))
    .where(and(
      eq(laporanWarga.rtGroupId, payload.rtGroupId!),
      inArray(laporanWarga.status, ['menunggu', 'diproses'])
    ))
    .orderBy(desc(laporanWarga.createdAt))
    .limit(50)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><span className="em">📝</span> Laporan Masuk</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <LaporanMasukClient items={list.map(r => ({
        id: r.laporan.id,
        kategori: r.laporan.kategori,
        judul: r.laporan.judul,
        isi: r.laporan.isi,
        status: r.laporan.status,
        tanggapan: r.laporan.tanggapan,
        namaPelapor: r.nama || r.phone || '-',
        createdAt: r.laporan.createdAt.toISOString(),
      }))} />
    </>
  )
}
