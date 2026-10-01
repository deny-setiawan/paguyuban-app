import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { iuranInvoices, iuranPayments } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { invoiceIds, metode, buktiUrl, catatan } = body

  if (!invoiceIds?.length) {
    return NextResponse.json({ error: 'Pilih minimal 1 tagihan' }, { status: 400 })
  }
  if (!metode) {
    return NextResponse.json({ error: 'Pilih metode pembayaran' }, { status: 400 })
  }

  // Verify invoices belong to this user and are unpaid
  const invoices = await db.select().from(iuranInvoices)
    .where(and(
      eq(iuranInvoices.wargaId, payload.sub),
      inArray(iuranInvoices.id, invoiceIds)
    ))

  const unpaid = invoices.filter(i => i.status === 'belum_bayar')
  if (!unpaid.length) {
    return NextResponse.json({ error: 'Tidak ada tagihan yang valid' }, { status: 400 })
  }

  const totalNominal = unpaid.reduce((s, i) => s + (i.nominal || 0), 0)

  // Create payment records for each invoice
  await db.insert(iuranPayments).values(
    unpaid.map(inv => ({
      rtGroupId: inv.rtGroupId,
      wargaId: payload.sub,
      invoiceId: inv.id,
      nominalBayar: inv.nominal,
      metode,
      statusVerif: 'pending' as const,
      buktiUrl: buktiUrl || null,
      catatan: catatan || null,
    }))
  )

  return NextResponse.json({ ok: true, jumlah: unpaid.length, total: totalNominal })
}
