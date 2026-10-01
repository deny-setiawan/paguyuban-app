import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { notifikasi } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.all) {
    await db.update(notifikasi)
      .set({ isRead: true })
      .where(eq(notifikasi.userId, payload.sub))
  } else if (body.id) {
    await db.update(notifikasi)
      .set({ isRead: true })
      .where(and(eq(notifikasi.id, body.id), eq(notifikasi.userId, payload.sub)))
  }

  return NextResponse.json({ ok: true })
}
