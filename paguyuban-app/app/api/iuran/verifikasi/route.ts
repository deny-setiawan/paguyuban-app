import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { iuranPayments, iuranInvoices, transaksi, profiles } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { BULAN } from '@/lib/utils'

const VERIF_ROLES = ['bendahara', 'admin', 'ketua']

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !VERIF_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select({
    payment: iuranPayments,
    invoice: iuranInvoices,
    nama: profiles.fullName,
    phone: profiles.phone,
    noRumah: profiles.noRumah,
  }).from(iuranPayments)
    .leftJoin(iuranInvoices, eq(iuranPayments.invoiceId, iuranInvoices.id))
    .leftJoin(profiles, eq(iuranPayments.wargaId, profiles.id))
    .where(and(eq(iuranPayments.rtGroupId, payload.rtGroupId), eq(iuranPayments.statusVerif, 'pending')))
    .orderBy(desc(iuranPayments.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !VERIF_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, action, catatan } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'id dan action wajib' }, { status: 400 })

  const [payment] = await db.select().from(iuranPayments).where(eq(iuranPayments.id, id)).limit(1)
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await db.update(iuranPayments).set({
      statusVerif: 'disetujui',
      verifiedBy: payload.sub,
      verifiedAt: new Date(),
      catatan: catatan || null,
    }).where(eq(iuranPayments.id, id))

    await db.update(iuranInvoices).set({ status: 'lunas' }).where(eq(iuranInvoices.id, payment.invoiceId))

    const lastTrans = await db.select().from(transaksi)
      .where(eq(transaksi.rtGroupId, payment.rtGroupId))
      .orderBy(desc(transaksi.createdAt))
      .limit(1)
    const saldoSekarang = lastTrans[0]?.saldoSetelah ?? 0

    const [invoice] = await db.select().from(iuranInvoices).where(eq(iuranInvoices.id, payment.invoiceId)).limit(1)
    const periodeLabel = invoice ? `${BULAN[invoice.periodeBulan]} ${invoice.periodeTahun}` : ''

    await db.insert(transaksi).values({
      rtGroupId: payment.rtGroupId,
      jenis: 'pemasukan',
      kategori: 'iuran',
      judul: `Iuran ${periodeLabel}`,
      nominal: payment.nominalBayar,
      saldoSetelah: saldoSekarang + payment.nominalBayar,
      tanggal: new Date().toISOString().split('T')[0],
      dibuatOleh: payload.sub,
    })

    return NextResponse.json({ ok: true, action: 'approved' })
  }

  if (action === 'reject') {
    await db.update(iuranPayments).set({
      statusVerif: 'ditolak',
      verifiedBy: payload.sub,
      verifiedAt: new Date(),
      catatan: catatan || 'Bukti pembayaran tidak valid',
    }).where(eq(iuranPayments.id, id))

    return NextResponse.json({ ok: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
