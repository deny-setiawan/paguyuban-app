import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { transaksi, rtGroups } from '@/lib/db/schema'
import { canAccess, type MenuConfig } from '@/lib/menu-config'
import { Wallet } from 'lucide-react'
import { eq, desc } from 'drizzle-orm'
import KasClient from './KasClient'
import Link from 'next/link'

export default async function KasPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')
  const menuConfig = payload.rtGroupId
    ? await db.select({ menuConfig: rtGroups.menuConfig }).from(rtGroups)
        .where(eq(rtGroups.id, payload.rtGroupId)).limit(1)
        .then(r => (r[0]?.menuConfig as MenuConfig) ?? null)
    : null
  if (!canAccess('kasRt', payload.role, menuConfig)) redirect('/pengurus')

  const list = await db.select().from(transaksi)
    .where(eq(transaksi.rtGroupId, payload.rtGroupId!))
    .orderBy(desc(transaksi.createdAt))
    .limit(100)

  const saldoKas = list[0]?.saldoSetelah ?? 0
  const canEdit = ['ketua', 'bendahara', 'admin'].includes(payload.role)

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Wallet size={16} /> Kas RT</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <KasClient
        items={list.map(t => ({
          id: t.id,
          jenis: t.jenis,
          kategori: t.kategori,
          judul: t.judul,
          keterangan: t.keterangan,
          nominal: t.nominal,
          saldoSetelah: t.saldoSetelah,
          tanggal: t.tanggal,
          createdAt: t.createdAt.toISOString(),
        }))}
        saldoKas={saldoKas}
        canEdit={canEdit}
      />
    </>
  )
}
