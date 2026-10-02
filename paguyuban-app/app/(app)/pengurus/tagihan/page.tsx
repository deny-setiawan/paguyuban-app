import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, iuranInvoices, iuranSettings } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CreditCard } from 'lucide-react'
import Link from 'next/link'
import TagihanClient from './TagihanClient'

export default async function TagihanPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  if (!['bendahara', 'admin', 'ketua'].includes(payload.role)) redirect('/pengurus')

  const rtGroupId = payload.rtGroupId
  if (!rtGroupId) redirect('/pengurus')

  let nominalDefault = 0
  try {
    const [settings] = await db.select().from(iuranSettings)
      .where(and(eq(iuranSettings.rtGroupId, rtGroupId), eq(iuranSettings.isActive, true)))
      .limit(1)
    nominalDefault = settings?.nominalBulanan ?? 0
  } catch {}

  let invoices: {
    id: string
    wargaNama: string
    wargaNoRumah: string | null
    periodeBulan: number
    periodeTahun: number
    nominal: number
    status: string
  }[] = []

  try {
    const rows = await db
      .select({
        id: iuranInvoices.id,
        wargaNama: profiles.fullName,
        wargaNoRumah: profiles.noRumah,
        periodeBulan: iuranInvoices.periodeBulan,
        periodeTahun: iuranInvoices.periodeTahun,
        nominal: iuranInvoices.nominal,
        status: iuranInvoices.status,
      })
      .from(iuranInvoices)
      .leftJoin(profiles, eq(iuranInvoices.wargaId, profiles.id))
      .where(eq(iuranInvoices.rtGroupId, rtGroupId))
      .orderBy(desc(iuranInvoices.periodeTahun), desc(iuranInvoices.periodeBulan))
      .limit(500)

    invoices = rows.map(r => ({
      id: r.id,
      wargaNama: r.wargaNama || '—',
      wargaNoRumah: r.wargaNoRumah,
      periodeBulan: r.periodeBulan,
      periodeTahun: r.periodeTahun,
      nominal: r.nominal,
      status: r.status,
    }))
  } catch {}

  const now = new Date()
  const currentBulan = now.getMonth() + 1
  const currentTahun = now.getFullYear()

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><CreditCard size={16} /> Tagihan Iuran</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <TagihanClient
        invoices={invoices}
        currentBulan={currentBulan}
        currentTahun={currentTahun}
        nominalDefault={nominalDefault}
      />
    </>
  )
}
