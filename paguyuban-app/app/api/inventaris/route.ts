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

    // Create new inventaris item (pengurus only)
    if (!action) {
      if (token) {
        const payload = await verifyJwt(token)
        if (!payload || !['ketua', 'admin'].includes(payload.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        const [rt] = await db.select().from(rtGroups).limit(1)
        if (!rt) return NextResponse.json({ error: 'No RT' }, { status: 400 })
        const { nama, hargaSewa, stokTotal, stok, deskripsi, fotoUrl } = data
        if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
        const [item] = await db.insert(inventaris).values({
          rtGroupId: rt.id,
          nama,
          hargaSewa: hargaSewa ?? 0,
          stokTotal: stokTotal ?? 1,
          stok: stok ?? stokTotal ?? 1,
          deskripsi: deskripsi || null,
          fotoUrl: fotoUrl || null,
        }).returning()
        return NextResponse.json({ ok: true, item })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

      // WA notification to penyewa
      if (penyewaHp) {
        try {
          const { DEFAULT_NOTIF_CONFIG, sendWhatsAppMessage, phoneToJid } = await import('@/lib/wa-client')
          const [rtData] = await db.select({ waNotifConfig: rtGroups.waNotifConfig })
            .from(rtGroups).where(eq(rtGroups.id, item.rtGroupId)).limit(1)
          const cfg = { ...DEFAULT_NOTIF_CONFIG, ...(rtData?.waNotifConfig as Record<string, unknown> ?? {}) }
          if (cfg.inventarisSewa !== false) {
            const totalStr = total > 0 ? `\nTotal: *Rp ${total.toLocaleString('id-ID')}*` : ''
            const kembaliStr = tglKembaliRencana ? `\nRencana kembali: ${tglKembaliRencana}` : ''
            const msg = `Halo *${penyewaNama}*! 📦\n\nPeminjaman *${item.nama}* (${jumlah}x) sudah tercatat dan akan segera diproses.${totalStr}\nTgl sewa: ${tglSewa}${kembaliStr}\n\nTerima kasih telah menggunakan fasilitas RT! 🙏`
            sendWhatsAppMessage(phoneToJid(penyewaHp), msg).catch(() => {})
          }
        } catch { /* jangan ganggu response utama */ }
      }

      return NextResponse.json({ ok: true, sewaId: sewa.id, total })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (e) {
    console.error('inventaris POST error', e)
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 })
  }
}
