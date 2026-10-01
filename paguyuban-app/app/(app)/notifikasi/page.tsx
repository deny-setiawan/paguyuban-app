import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, notifikasi } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import NotifikasiClient from './NotifikasiClient'

export default async function NotifikasiPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const list = await db.select().from(notifikasi)
    .where(eq(notifikasi.userId, profile.id))
    .orderBy(desc(notifikasi.createdAt))
    .limit(50)

  const serialized = list.map(n => ({
    id: n.id,
    judul: n.judul,
    isi: n.isi,
    kategori: n.kategori,
    prioritas: n.prioritas,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))

  return <NotifikasiClient items={serialized} />
}
