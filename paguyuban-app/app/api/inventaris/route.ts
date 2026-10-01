import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inventaris, rtGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'
import { profiles } from '@/lib/db/schema'

export async function GET() {
  try {
    // Get default RT
    const [rt] = await db.select().from(rtGroups).limit(1)
    if (!rt) return NextResponse.json({ items: [] })

    const items = await db.select().from(inventaris).where(eq(inventaris.rtGroupId, rt.id))
    return NextResponse.json({ items })
  } catch (e) {
    console.error('inventaris GET error', e)
    return NextResponse.json({ error: 'Gagal memuat inventaris' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Optional auth — get profile if logged in
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    let profileId: string | null = null
    let profileName: string | null = null

    if (token) {
      const payload = await verifyJwt(token)
      if (payload) {
        const [p] = await db.select().from(profiles).where(eq(profiles.id, payload.sub)).limit(1)
        if (p) { profileId = p.id; profileName = p.fullName || p.phone }
      }
    }

    const body = await req.json()
    const { action, ...data } = body

    if (action === 'sewa') {
      const { inventarisId, penyewaNama, penyewaHp, jumlah = 1, tglSewa, tglKembaliRencana } = data
      if (!inventarisId || !penyewaNama || !tglSewa) {
        return NextResponse.json({ error: 'Data sewa tidak lengkap' }, { status: 400 })
      }

      // Check stok
      const [item] = await db.select().from(inventaris).where(eq(inventaris.id, inventarisId)).limit(1)
      if (!item) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 })
      if ((item.stok || 0) < jumlah) {
        return NextResponse.json({ error: `Stok hanya tersedia ${item.stok}` }, { status: 400 })
      }

      const { inventarisSewa } = await import('@/lib/db/schema')
      const total = (item.hargaSewa || 0) * jumlah
      const [sewa] = await db.insert(inventarisSewa).values({
        inventarisId,
        inventarisNama: item.nama,
        penyewaId: profileId || undefined,
        penyewaNama: penyewaNama || profileName || 'Tamu',
        penyewaHp: penyewaHp || null,
        penyewaTipe: profileId ? 'Warga' : 'Tamu',
        jumlah,
        tglSewa,
        tglKembaliRencana: tglKembaliRencana || null,
        hargaSatuan: item.hargaSewa,
        total,
        status: 'disewa',
      }).returning()

      // Decrement stok
      await db.update(inventaris)
        .set({ stok: (item.stok || 1) - jumlah })
        .where(eq(inventaris.id, inventarisId))

      return NextResponse.json({ ok: true, sewaId: sewa.id, total })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (e) {
    console.error('inventaris POST error', e)
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 })
  }
}
