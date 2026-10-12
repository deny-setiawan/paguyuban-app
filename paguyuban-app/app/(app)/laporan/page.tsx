import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, laporanWarga } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import LaporanClient from './LaporanClient'

export default async function LaporanPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const pengurusProfile = alias(profiles, 'pengurus')

  const list = await db.select({
    id: laporanWarga.id,
    kategori: laporanWarga.kategori,
    judul: laporanWarga.judul,
    isi: laporanWarga.isi,
    status: laporanWarga.status,
    tanggapan: laporanWarga.tanggapan,
    createdAt: laporanWarga.createdAt,
    namaTanggapiOleh: pengurusProfile.fullName,
  }).from(laporanWarga)
    .leftJoin(pengurusProfile, eq(laporanWarga.tanggapiOleh, pengurusProfile.id))
    .where(eq(laporanWarga.pelaporId, profile.id))
    .orderBy(desc(laporanWarga.createdAt))
    .limit(30)

  const serialized = list.map(l => ({
    id: l.id,
    kategori: l.kategori,
    judul: l.judul,
    isi: l.isi,
    status: l.status,
    tanggapan: l.tanggapan,
    createdAt: l.createdAt.toISOString(),
    namaTanggapiOleh: l.namaTanggapiOleh ?? null,
  }))

  return <LaporanClient laporan={serialized} />
}
