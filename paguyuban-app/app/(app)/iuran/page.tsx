import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, iuranInvoices, iuranPayments } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import IuranClient from './IuranClient'

export default async function IuranPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')

  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const [invoices, payments] = await Promise.all([
    db.select().from(iuranInvoices)
      .where(eq(iuranInvoices.wargaId, profile.id))
      .orderBy(desc(iuranInvoices.periodeTahun), desc(iuranInvoices.periodeBulan)),
    db.select().from(iuranPayments)
      .where(eq(iuranPayments.wargaId, profile.id))
      .orderBy(desc(iuranPayments.createdAt)).limit(20),
  ])

  let rt = null
  if (profile.rtGroupId) {
    const [rtData] = await db.select().from(rtGroups).where(eq(rtGroups.id, profile.rtGroupId)).limit(1)
    rt = rtData ?? null
  }

  return (
    <IuranClient
      invoices={invoices}
      payments={payments}
      rtBank={rt?.bankNama}
      rtRekening={rt?.noRekening}
      rtAtasNama={rt?.bankAtasNama}
    />
  )
}
