import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { surat, profiles, warga } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await db.select().from(surat)
    .where(eq(surat.pemohonId, payload.sub))
    .orderBy(desc(surat.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { jenis, keperluan, namaPemohon, nikPemohon, dataTambahan } = body

  if (!jenis || !keperluan) {
    return NextResponse.json({ error: 'Jenis surat dan keperluan wajib diisi' }, { status: 400 })
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile?.rtGroupId) {
    return NextResponse.json({ error: 'Akun belum terdaftar di RT' }, { status: 403 })
  }

  // Get warga data for NIK/nama if not provided
  const [wargaData] = await db.select().from(warga)
    .where(eq(warga.profileId, payload.sub)).limit(1)

  const [newSurat] = await db.insert(surat).values({
    rtGroupId: profile.rtGroupId,
    pemohonId: payload.sub,
    jenis,
    keperluan,
    namaPemohon: namaPemohon || wargaData?.namaLengkap || profile.fullName || null,
    nikPemohon: nikPemohon || wargaData?.nik || null,
    noRumah: profile.noRumah || wargaData?.noRumah || null,
    dataTambahan: dataTambahan || null,
    status: 'diajukan',
  }).returning()

  return NextResponse.json({ ok: true, surat: newSurat })
}
