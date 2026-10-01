import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { transaksi } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const VIEW_ROLES = ['ketua', 'sekretaris', 'bendahara', 'admin']
const KAS_ROLES = ['ketua', 'bendahara', 'admin']

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !VIEW_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select().from(transaksi)
    .where(eq(transaksi.rtGroupId, payload.rtGroupId))
    .orderBy(desc(transaksi.createdAt))
    .limit(100)

  return NextResponse.json({ list })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !KAS_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const { jenis, kategori, judul, keterangan, nominal, tanggal } = await req.json()
  if (!jenis || !judul || !nominal || !tanggal) {
    return NextResponse.json({ error: 'Jenis, judul, nominal, tanggal wajib diisi' }, { status: 400 })
  }

  const lastTrans = await db.select().from(transaksi)
    .where(eq(transaksi.rtGroupId, payload.rtGroupId))
    .orderBy(desc(transaksi.createdAt))
    .limit(1)

  const saldoSekarang = lastTrans[0]?.saldoSetelah ?? 0
  const saldoSetelah = jenis === 'pemasukan'
    ? saldoSekarang + Number(nominal)
    : saldoSekarang - Number(nominal)

  const [item] = await db.insert(transaksi).values({
    rtGroupId: payload.rtGroupId,
    jenis,
    kategori: kategori || null,
    judul,
    keterangan: keterangan || null,
    nominal: Number(nominal),
    saldoSetelah,
    tanggal,
    dibuatOleh: payload.sub,
  }).returning()

  return NextResponse.json({ ok: true, item, saldoSetelah })
}
