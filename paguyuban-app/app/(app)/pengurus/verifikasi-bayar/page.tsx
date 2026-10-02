import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { iuranPayments, iuranInvoices, profiles } from '@/lib/db/schema'
import { CreditCard } from 'lucide-react'
import { and, eq, desc } from 'drizzle-orm'
import VerifikasiBayarClient from './VerifikasiBayarClient'
import Link from 'next/link'
import { BULAN } from '@/lib/utils'

export default async function VerifikasiBayarPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['bendahara', 'admin', 'ketua'].includes(payload.role)) redirect('/pengurus')

  const list = await db.select({
    payment: iuranPayments,
    invoice: iuranInvoices,
    nama: profiles.fullName,
    phone: profiles.phone,
    noRumah: profiles.noRumah,
  }).from(iuranPayments)
    .leftJoin(iuranInvoices, eq(iuranPayments.invoiceId, iuranInvoices.id))
    .leftJoin(profiles, eq(iuranPayments.wargaId, profiles.id))
    .where(and(eq(iuranPayments.rtGroupId, payload.rtGroupId!), eq(iuranPayments.statusVerif, 'pending')))
    .orderBy(desc(iuranPayments.createdAt))
    .limit(50)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><CreditCard size={16} /> Verifikasi Pembayaran</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <VerifikasiBayarClient items={list.map(r => ({
        id: r.payment.id,
        nama: r.nama || r.phone || '-',
        noRumah: r.noRumah || '-',
        nominal: r.payment.nominalBayar,
        metode: r.payment.metode || 'transfer',
        buktiUrl: r.payment.buktiUrl,
        periode: r.invoice ? `${BULAN[r.invoice.periodeBulan]} ${r.invoice.periodeTahun}` : '-',
        createdAt: r.payment.createdAt.toISOString(),
      }))} />
    </>
  )
}
