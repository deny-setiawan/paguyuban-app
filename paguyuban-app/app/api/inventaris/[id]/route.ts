import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { inventaris } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const ADMIN_ROLES = ['ketua', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !ADMIN_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['nama', 'hargaSewa', 'stokTotal', 'stok', 'deskripsi', 'fotoUrl']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  await db.update(inventaris).set(updates).where(
    and(eq(inventaris.id, id), eq(inventaris.rtGroupId, payload.rtGroupId!))
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !ADMIN_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await db.delete(inventaris).where(and(eq(inventaris.id, id), eq(inventaris.rtGroupId, payload.rtGroupId!)))
  return NextResponse.json({ ok: true })
}
