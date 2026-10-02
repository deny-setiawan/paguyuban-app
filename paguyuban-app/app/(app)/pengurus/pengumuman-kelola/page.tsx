import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { pengumuman } from '@/lib/db/schema'
import { Megaphone } from 'lucide-react'
import { eq, desc } from 'drizzle-orm'
import PengumumanKelolaClient from './PengumumanKelolaClient'
import Link from 'next/link'

export default async function PengumumanKelolaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'admin'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select().from(pengumuman)
    .where(eq(pengumuman.rtGroupId, payload.rtGroupId!))
    .orderBy(desc(pengumuman.createdAt))
    .limit(50)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Megaphone size={16} /> Kelola Pengumuman</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <PengumumanKelolaClient items={list.map(p => ({
        id: p.id,
        judul: p.judul,
        isi: p.isi,
        kategori: p.kategori,
        prioritas: p.prioritas,
        isPublished: p.isPublished,
        createdAt: p.createdAt.toISOString(),
      }))} />
    </>
  )
}
