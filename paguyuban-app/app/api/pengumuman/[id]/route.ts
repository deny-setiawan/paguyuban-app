import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { pengumuman } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const PENGURUS = ['ketua', 'sekretaris', 'bendahara', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { judul, isi, kategori, prioritas, isPublished } = await req.json()

  await db.update(pengumuman).set({
    ...(judul !== undefined && { judul }),
    ...(isi !== undefined && { isi }),
    ...(kategori !== undefined && { kategori }),
    ...(prioritas !== undefined && { prioritas }),
    ...(isPublished !== undefined && { isPublished }),
  }).where(and(eq(pengumuman.id, id), eq(pengumuman.rtGroupId, payload.rtGroupId!)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PENGURUS.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await db.delete(pengumuman).where(and(eq(pengumuman.id, id), eq(pengumuman.rtGroupId, payload.rtGroupId!)))
  return NextResponse.json({ ok: true })
}
