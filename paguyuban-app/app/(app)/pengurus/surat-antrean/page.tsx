import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { surat, profiles } from '@/lib/db/schema'
import { and, eq, inArray, desc } from 'drizzle-orm'
import SuratAntreanClient from './SuratAntreanClient'
import Link from 'next/link'

export default async function SuratAntreanPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'admin'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select({
    surat,
    nama: profiles.fullName,
    phone: profiles.phone,
    noRumah: profiles.noRumah,
  }).from(surat)
    .leftJoin(profiles, eq(surat.pemohonId, profiles.id))
    .where(and(
      eq(surat.rtGroupId, payload.rtGroupId!),
      inArray(surat.status, ['diajukan', 'diproses'])
    ))
    .orderBy(desc(surat.createdAt))
    .limit(50)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><span className="em">✉️</span> Antrian Surat</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <SuratAntreanClient items={list.map(r => ({
        id: r.surat.id,
        jenis: r.surat.jenis,
        keperluan: r.surat.keperluan,
        namaPemohon: r.surat.namaPemohon || r.nama || '-',
        noRumah: r.surat.noRumah || r.noRumah || '-',
        status: r.surat.status,
        nomorSurat: r.surat.nomorSurat,
        dataTambahan: r.surat.dataTambahan as Record<string, string> | null,
        createdAt: r.surat.createdAt.toISOString(),
      }))} />
    </>
  )
}
