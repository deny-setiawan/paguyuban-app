import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { inventaris, inventarisSewa } from '@/lib/db/schema'
import { Package } from 'lucide-react'
import { eq, desc } from 'drizzle-orm'
import InventarisKelolaClient from './InventarisKelolaClient'
import Link from 'next/link'

export default async function InventarisKelolaPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'admin'].includes(payload.role)) redirect('/pengurus')

  const [items, activeSewa] = await Promise.all([
    db.select().from(inventaris)
      .where(eq(inventaris.rtGroupId, payload.rtGroupId!))
      .orderBy(inventaris.nama),
    db.select().from(inventarisSewa)
      .where(eq(inventarisSewa.status, 'disewa'))
      .orderBy(desc(inventarisSewa.createdAt))
      .limit(50),
  ])

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Package size={16} /> Kelola Inventaris</div>
        <Link href="/pengurus" style={{ fontSize: 13, color: 'var(--g600)', textDecoration: 'none', fontWeight: 700 }}>← Kembali</Link>
      </div>
      <InventarisKelolaClient
        items={items.map(i => ({
          id: i.id,
          nama: i.nama,
          hargaSewa: i.hargaSewa,
          stok: i.stok,
          stokTotal: i.stokTotal,
          deskripsi: i.deskripsi,
          fotoUrl: i.fotoUrl,
        }))}
        activeSewa={activeSewa.map(s => ({
          id: s.id,
          inventarisNama: s.inventarisNama,
          penyewaNama: s.penyewaNama,
          penyewaHp: s.penyewaHp,
          tglSewa: s.tglSewa,
          tglKembaliRencana: s.tglKembaliRencana,
          jumlah: s.jumlah,
          inventarisId: s.inventarisId,
        }))}
      />
    </>
  )
}
