import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, kendaraan } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.select().from(kendaraan)
    .where(eq(kendaraan.profileId, payload.sub))
    .orderBy(desc(kendaraan.createdAt))

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { jenis, platNomor, merk, warna, tahun, namaPemilik, noStnk, pajakBerlakuSampai, catatan } = body

  if (!platNomor?.trim()) {
    return NextResponse.json({ error: 'Plat nomor wajib diisi' }, { status: 400 })
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile?.rtGroupId) {
    return NextResponse.json({ error: 'Akun belum terdaftar di RT' }, { status: 403 })
  }

  const [item] = await db.insert(kendaraan).values({
    rtGroupId: profile.rtGroupId,
    profileId: payload.sub,
    jenis: jenis || 'motor',
    platNomor: platNomor.trim().toUpperCase(),
    merk: merk?.trim() || null,
    warna: warna?.trim() || null,
    tahun: tahun?.trim() || null,
    namaPemilik: namaPemilik?.trim() || null,
    noStnk: noStnk?.trim() || null,
    pajakBerlakuSampai: pajakBerlakuSampai || null,
    catatan: catatan?.trim() || null,
  }).returning()

  return NextResponse.json({ ok: true, kendaraan: item })
}
