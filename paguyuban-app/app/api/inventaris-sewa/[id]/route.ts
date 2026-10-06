import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { inventaris, inventarisSewa } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action } = body

  const [sewa] = await db.select().from(inventarisSewa).where(eq(inventarisSewa.id, id)).limit(1)
  if (!sewa) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  const isWarga = !payload.role || payload.role === 'warga' || payload.role === 'tamu'
  if (isWarga && sewa.penyewaId !== payload.sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'kembalikan') {
    const tglKembali = body.tglKembali || new Date().toISOString().split('T')[0]
    await db.update(inventarisSewa).set({ status: 'dikembalikan', tglKembali }).where(eq(inventarisSewa.id, id))
    // Increment stok
    if (sewa.inventarisId) {
      const [item] = await db.select().from(inventaris).where(eq(inventaris.id, sewa.inventarisId)).limit(1)
      if (item) {
        await db.update(inventaris).set({ stok: (item.stok || 0) + (sewa.jumlah || 1) }).where(eq(inventaris.id, sewa.inventarisId))
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'ubah_tanggal') {
    const { tglKembaliRencana } = body
    if (!tglKembaliRencana) return NextResponse.json({ error: 'tglKembaliRencana wajib diisi' }, { status: 400 })
    await db.update(inventarisSewa).set({ tglKembaliRencana }).where(eq(inventarisSewa.id, id))
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 })
}
