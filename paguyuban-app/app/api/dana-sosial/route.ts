import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { danaSosialHistory, warga, profiles } from '@/lib/db/schema'
import { and, eq, count } from 'drizzle-orm'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { jenis, wargaId, noRumah, catatan } = await req.json()
  const rtGroupId = payload.rtGroupId!
  const tahun = new Date().getFullYear()

  if (jenis !== 'sakit' && jenis !== 'kelahiran') {
    return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
  }

  const [recorder] = await db.select({ fullName: profiles.fullName })
    .from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  const createdByName = recorder?.fullName || null

  if (jenis === 'sakit') {
    if (!wargaId) return NextResponse.json({ error: 'wargaId wajib untuk dansos sakit' }, { status: 400 })

    const [target] = await db.select({ id: warga.id, namaLengkap: warga.namaLengkap, noRumah: warga.noRumah })
      .from(warga).where(and(eq(warga.id, wargaId), eq(warga.rtGroupId, rtGroupId))).limit(1)
    if (!target) return NextResponse.json({ error: 'Warga tidak ditemukan' }, { status: 404 })

    const [countRes] = await db
      .select({ cnt: count() })
      .from(danaSosialHistory)
      .where(and(
        eq(danaSosialHistory.rtGroupId, rtGroupId),
        eq(danaSosialHistory.wargaId, wargaId),
        eq(danaSosialHistory.jenis, 'sakit'),
        eq(danaSosialHistory.tahun, tahun),
      ))
    const currentCount = Number(countRes?.cnt ?? 0)
    if (currentCount >= 2) {
      return NextResponse.json({ error: `Kuota dansos sakit ${target.namaLengkap} sudah habis untuk tahun ${tahun} (2/2)` }, { status: 400 })
    }

    await db.insert(danaSosialHistory).values({
      rtGroupId, wargaId, namaWarga: target.namaLengkap, noRumah: target.noRumah,
      jenis: 'sakit', tahun, catatan: catatan || null,
      createdByProfileId: payload.sub, createdByName,
    })
    await db.update(warga).set({ dansosSakitTerpakai: currentCount + 1 }).where(eq(warga.id, wargaId))
    return NextResponse.json({ ok: true, count: currentCount + 1 })
  }

  // Kelahiran
  if (!noRumah) return NextResponse.json({ error: 'noRumah wajib untuk dansos kelahiran' }, { status: 400 })

  const [countRes] = await db
    .select({ cnt: count() })
    .from(danaSosialHistory)
    .where(and(
      eq(danaSosialHistory.rtGroupId, rtGroupId),
      eq(danaSosialHistory.noRumah, noRumah),
      eq(danaSosialHistory.jenis, 'kelahiran'),
    ))
  const currentCount = Number(countRes?.cnt ?? 0)
  if (currentCount >= 2) {
    return NextResponse.json({ error: `Kuota dansos kelahiran No. ${noRumah} sudah habis (2/2 seumur hidup)` }, { status: 400 })
  }

  const [kepala] = await db.select({ id: warga.id, namaLengkap: warga.namaLengkap })
    .from(warga).where(and(
      eq(warga.noRumah, noRumah), eq(warga.rtGroupId, rtGroupId), eq(warga.kkStatus, 'kepala_kk')
    )).limit(1)

  await db.insert(danaSosialHistory).values({
    rtGroupId, wargaId: kepala?.id || null,
    namaWarga: kepala?.namaLengkap || `No. ${noRumah}`, noRumah,
    jenis: 'kelahiran', tahun, catatan: catatan || null,
    createdByProfileId: payload.sub, createdByName,
  })
  if (kepala) {
    await db.update(warga).set({ dansosKelahiranTerpakai: currentCount + 1 }).where(eq(warga.id, kepala.id))
  }
  return NextResponse.json({ ok: true, count: currentCount + 1 })
}
