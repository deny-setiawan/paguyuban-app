import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, iuranInvoices, iuranSettings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['bendahara', 'admin', 'ketua'].includes(payload.role)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const rtGroupId = payload.rtGroupId
  if (!rtGroupId) return NextResponse.json({ error: 'RT tidak ditemukan' }, { status: 400 })

  const body = await req.json()
  const { bulan, tahun, nominal: nominalInput } = body

  if (!bulan || !tahun || bulan < 1 || bulan > 12 || tahun < 2020) {
    return NextResponse.json({ error: 'Bulan dan tahun tidak valid' }, { status: 400 })
  }

  // Get nominal from settings or use input
  let nominalBulanan = nominalInput ? Number(nominalInput) : 0
  if (!nominalBulanan) {
    const [settings] = await db.select().from(iuranSettings)
      .where(and(eq(iuranSettings.rtGroupId, rtGroupId), eq(iuranSettings.isActive, true)))
      .limit(1)
    nominalBulanan = settings?.nominalBulanan || 0
  }

  if (!nominalBulanan || nominalBulanan <= 0) {
    return NextResponse.json({ error: 'Nominal iuran belum diatur. Masukkan nominal secara manual.' }, { status: 400 })
  }

  // Get all active warga for this RT
  const allWarga = await db.select({ id: profiles.id }).from(profiles)
    .where(and(
      eq(profiles.rtGroupId, rtGroupId),
      eq(profiles.isActive, true),
      eq(profiles.role, 'warga'),
    ))

  if (!allWarga.length) {
    return NextResponse.json({ error: 'Tidak ada warga aktif di RT ini' }, { status: 400 })
  }

  // Check existing invoices for this period
  const existing = await db.select({ wargaId: iuranInvoices.wargaId }).from(iuranInvoices)
    .where(and(
      eq(iuranInvoices.rtGroupId, rtGroupId),
      eq(iuranInvoices.periodeBulan, bulan),
      eq(iuranInvoices.periodeTahun, tahun),
    ))

  const existingWargaIds = new Set(existing.map(e => e.wargaId))
  const toCreate = allWarga.filter(w => !existingWargaIds.has(w.id))

  if (!toCreate.length) {
    return NextResponse.json({
      ok: true,
      created: 0,
      skipped: allWarga.length,
      nominal: nominalBulanan,
      message: `Semua ${allWarga.length} tagihan bulan ini sudah ada`,
    })
  }

  const periode = `${tahun}-${String(bulan).padStart(2, '0')}`

  await db.insert(iuranInvoices).values(
    toCreate.map(w => ({
      rtGroupId,
      wargaId: w.id,
      periode,
      periodeBulan: bulan,
      periodeTahun: tahun,
      nominal: nominalBulanan,
      status: 'belum_bayar' as const,
    }))
  )

  return NextResponse.json({
    ok: true,
    created: toCreate.length,
    skipped: existingWargaIds.size,
    nominal: nominalBulanan,
    message: `${toCreate.length} tagihan berhasil dibuat`,
  })
}
