import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { iuranInvoices, iuranPayments } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [invoices, payments] = await Promise.all([
    db.select().from(iuranInvoices)
      .where(eq(iuranInvoices.wargaId, payload.sub))
      .orderBy(desc(iuranInvoices.periodeTahun), desc(iuranInvoices.periodeBulan)),
    db.select().from(iuranPayments)
      .where(eq(iuranPayments.wargaId, payload.sub))
      .orderBy(desc(iuranPayments.createdAt))
      .limit(20),
  ])

  return NextResponse.json({ invoices, payments })
}
