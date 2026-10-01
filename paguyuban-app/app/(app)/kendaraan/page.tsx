import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, kendaraan } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import KendaraanClient from './KendaraanClient'

export default async function KendaraanPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const items = await db.select().from(kendaraan)
    .where(eq(kendaraan.profileId, profile.id))
    .orderBy(desc(kendaraan.createdAt))

  const serialized = items.map(k => ({
    id: k.id,
    jenis: k.jenis,
    platNomor: k.platNomor,
    merk: k.merk,
    warna: k.warna,
    tahun: k.tahun,
    namaPemilik: k.namaPemilik,
    noStnk: k.noStnk,
    pajakBerlakuSampai: k.pajakBerlakuSampai,
    catatan: k.catatan,
    createdAt: k.createdAt.toISOString(),
  }))

  return <KendaraanClient items={serialized} />
}
