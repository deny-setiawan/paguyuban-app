import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { surat } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

const PROSES_ROLES = ['ketua', 'sekretaris', 'admin']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !PROSES_ROLES.includes(payload.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, nomorSurat } = await req.json()

  const updates: Record<string, unknown> = { dibuatOleh: payload.sub }
  if (status) updates.status = status
  if (nomorSurat !== undefined) updates.nomorSurat = nomorSurat

  await db.update(surat).set(updates).where(
    and(eq(surat.id, id), eq(surat.rtGroupId, payload.rtGroupId!))
  )
  return NextResponse.json({ ok: true })
}
