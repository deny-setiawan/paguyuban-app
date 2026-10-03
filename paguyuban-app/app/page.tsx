import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles, rtGroups, pengumuman, inventaris, warga } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import Shell from '@/components/layout/Shell'
import GuestPage from '@/components/home/GuestPage'

const PENGURUS_ROLES = ['ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'humas', 'lingkungan', 'keamanan', 'peralatan', 'admin']

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (token) {
    const payload = await verifyJwt(token)
    if (payload) {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
      if (profile) {
        if (PENGURUS_ROLES.includes(profile.role)) redirect('/pengurus')
        redirect('/beranda')
      }
    }
  }

  // Guest view
  const defaultRt = await db.select().from(rtGroups).limit(1).then(r => r[0] ?? null)
  let guestPengumuman: { id: string; judul: string; isi: string | null; kategori: string | null; prioritas: string | null; createdAt: string }[] = []
  let guestInventaris: { id: string; nama: string; hargaSewa: number | null; stok: number | null; fotoUrl: string | null; deskripsi: string | null }[] = []
  let rtStats = { jumlahWarga: 0, jumlahKk: 0 }

  if (defaultRt) {
    try {
      const [pengumumanRaw, inventarisRaw, wargaCount] = await Promise.all([
        db.select().from(pengumuman)
          .where(and(eq(pengumuman.rtGroupId, defaultRt.id), eq(pengumuman.isPublished, true)))
          .orderBy(desc(pengumuman.createdAt)).limit(3),
        db.select().from(inventaris).where(eq(inventaris.rtGroupId, defaultRt.id)),
        db.select({ c: count() }).from(warga).where(eq(warga.rtGroupId, defaultRt.id)),
      ])
      guestPengumuman = pengumumanRaw.map(p => ({
        id: p.id, judul: p.judul, isi: p.isi, kategori: p.kategori,
        prioritas: p.prioritas, createdAt: p.createdAt.toISOString(),
      }))
      guestInventaris = inventarisRaw.map(i => ({
        id: i.id, nama: i.nama, hargaSewa: i.hargaSewa,
        stok: i.stok, fotoUrl: i.fotoUrl, deskripsi: i.deskripsi,
      }))
      rtStats = {
        jumlahWarga: wargaCount[0]?.c ?? 0,
        jumlahKk: defaultRt.jumlahKk ?? 0,
      }
    } catch {
      // Tables not yet migrated — degrade gracefully
    }
  }

  return (
    <Shell>
      <GuestPage
        rtName={defaultRt?.namaRt || 'Paguyuban PKR-Pepe'}
        rtId={defaultRt?.id}
        pengumuman={guestPengumuman}
        inventaris={guestInventaris}
        rtStats={rtStats}
        pemutakhiranActive={defaultRt?.pemutakhiranActive ?? false}
        pemutakhiranTahun={defaultRt?.pemutakhiranTahun ?? null}
      />
    </Shell>
  )
}
