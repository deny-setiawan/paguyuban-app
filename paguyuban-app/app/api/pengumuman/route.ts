import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { pengumuman } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

const PENGURUS = ['ketua', 'sekretaris', 'bendahara', 'admin']

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select().from(pengumuman)
    .where(eq(pengumuman.rtGroupId, payload.rtGroupId))
    .orderBy(desc(pengumuman.createdAt))
    .limit(50)

  return NextResponse.json({ list })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const { judul, isi, kategori, prioritas, isPublished } = await req.json()
  if (!judul) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })

  const [item] = await db.insert(pengumuman).values({
    rtGroupId: payload.rtGroupId,
    judul,
    isi: isi || null,
    kategori: kategori || 'umum',
    prioritas: prioritas || 'normal',
    isPublished: isPublished !== false,
    dibuatOleh: payload.sub,
  }).returning()

  return NextResponse.json({ ok: true, item })
}
