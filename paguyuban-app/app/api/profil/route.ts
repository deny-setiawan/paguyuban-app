import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, warga, rtGroups, wargaInvites } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData
  }

  const [wargaData] = await db.select().from(warga).where(eq(warga.profileId, payload.sub)).limit(1)

  return NextResponse.json({ profile, rt, warga: wargaData })
}

export async function PUT(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { fullName, email, noRumah, statusSosial, pekerjaan, tanggalLahir } = body

  const [updated] = await db.update(profiles)
    .set({
      fullName: fullName?.trim() || null,
      email: email?.trim() || null,
      noRumah: noRumah?.trim() || null,
      statusSosial: statusSosial || null,
    })
    .where(eq(profiles.id, payload.sub))
    .returning()

  // Update warga record if pekerjaan or tanggalLahir provided
  if (pekerjaan !== undefined || tanggalLahir !== undefined) {
    const [wargaData] = await db.select().from(warga).where(eq(warga.profileId, payload.sub)).limit(1)
    if (wargaData) {
      await db.update(warga)
        .set({
          pekerjaan: pekerjaan ?? wargaData.pekerjaan,
          tanggalLahir: tanggalLahir ?? wargaData.tanggalLahir,
        })
        .where(eq(warga.id, wargaData.id))
    }
  }

  return NextResponse.json({ ok: true, profile: updated })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appendFotoUrls } = await req.json()
  if (!Array.isArray(appendFotoUrls) || appendFotoUrls.length === 0) {
    return NextResponse.json({ error: 'appendFotoUrls wajib diisi' }, { status: 400 })
  }

  const [latestInvite] = await db.select()
    .from(wargaInvites)
    .where(eq(wargaInvites.profileId, payload.sub))
    .orderBy(desc(wargaInvites.createdAt))
    .limit(1)

  if (!latestInvite) {
    return NextResponse.json({ error: 'Data pendaftaran tidak ditemukan. Hubungi pengurus RT.' }, { status: 404 })
  }

  const existing = Array.isArray(latestInvite.fotoFiles) ? (latestInvite.fotoFiles as string[]) : []
  await db.update(wargaInvites)
    .set({ fotoFiles: [...existing, ...appendFotoUrls] })
    .where(eq(wargaInvites.id, latestInvite.id))

  return NextResponse.json({ ok: true })
}
