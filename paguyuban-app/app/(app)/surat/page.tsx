import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, surat } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import SuratClient from './SuratClient'

export default async function SuratPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const list = await db.select().from(surat)
    .where(eq(surat.pemohonId, profile.id))
    .orderBy(desc(surat.createdAt))
    .limit(30)

  const serialized = list.map(s => ({
    id: s.id,
    jenis: s.jenis,
    keperluan: s.keperluan,
    status: s.status,
    nomorSurat: s.nomorSurat,
    createdAt: s.createdAt.toISOString(),
  }))

  return <SuratClient suratList={serialized} />
}
