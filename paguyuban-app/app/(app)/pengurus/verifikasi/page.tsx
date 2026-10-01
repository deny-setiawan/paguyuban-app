import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { wargaInvites } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import VerifikasiClient from './VerifikasiClient'
import Link from 'next/link'

export default async function VerifikasiPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'admin'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select().from(wargaInvites)
    .where(eq(wargaInvites.rtGroupId, payload.rtGroupId!))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(50)

  const canApprove = ['ketua', 'admin'].includes(payload.role)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><span className="em">👥</span> Verifikasi Warga Baru</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <VerifikasiClient items={list.map(i => ({
        id: i.id,
        nama: i.nama,
        noRumah: i.noRumah,
        status: i.status || 'pending',
        jenis: i.jenis || 'warga_baru',
        dataKk: i.dataKk as Record<string, string> | null,
        anggota: i.anggota as Array<Record<string, string>> | null,
        createdAt: i.createdAt.toISOString(),
      }))} canApprove={canApprove} />
    </>
  )
}
