import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, inventaris, inventarisSewa } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import InventarisClient from './InventarisClient'
import { Package } from 'lucide-react'

export default async function InventarisPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) redirect('/')
  const payload = await verifyJwt(token)
  if (!payload) redirect('/')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
  if (!profile) redirect('/')

  const [items, activeSewa, riwayat] = await Promise.all([
    db.select().from(inventaris)
      .where(eq(inventaris.rtGroupId, profile.rtGroupId!))
      .orderBy(inventaris.nama),
    db.select().from(inventarisSewa)
      .where(and(eq(inventarisSewa.penyewaId, profile.id), eq(inventarisSewa.status, 'disewa'))),
    db.select({
      id: inventarisSewa.id,
      inventarisNama: inventarisSewa.inventarisNama,
      tglSewa: inventarisSewa.tglSewa,
      tglKembali: inventarisSewa.tglKembali,
      jumlah: inventarisSewa.jumlah,
      total: inventarisSewa.total,
    }).from(inventarisSewa)
      .where(and(eq(inventarisSewa.penyewaId, profile.id), eq(inventarisSewa.status, 'dikembalikan')))
      .orderBy(desc(inventarisSewa.tglKembali))
      .limit(20),
  ])

  return (
    <>
      <div className="sec-h" style={{ marginBottom: 16 }}>
        <div className="t"><Package size={16} /> Inventaris RT</div>
      </div>
      <InventarisClient
        items={items.map(i => ({
          id: i.id,
          nama: i.nama,
          hargaSewa: i.hargaSewa,
          stokTotal: i.stokTotal,
          stok: i.stok,
          deskripsi: i.deskripsi,
          fotoUrl: i.fotoUrl,
        }))}
        activeSewa={activeSewa.map(s => ({
          id: s.id,
          inventarisId: s.inventarisId,
          inventarisNama: s.inventarisNama,
          tglSewa: s.tglSewa,
          tglKembaliRencana: s.tglKembaliRencana,
          jumlah: s.jumlah,
          hargaSatuan: s.hargaSatuan,
          total: s.total,
        }))}
        riwayat={riwayat}
        profileId={profile.id}
        profileName={profile.fullName}
        profilePhone={profile.phone}
      />
    </>
  )
}
