import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select({
    id: profiles.id,
    phone: profiles.phone,
    fullName: profiles.fullName,
    role: profiles.role,
    isActive: profiles.isActive,
    noRumah: profiles.noRumah,
    createdAt: profiles.createdAt,
  }).from(profiles).where(eq(profiles.rtGroupId, payload.rtGroupId))

  return NextResponse.json({ list })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role, isActive } = await req.json()
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (role) updates.role = role
  if (isActive !== undefined) updates.isActive = isActive

  await db.update(profiles).set(updates).where(eq(profiles.id, id))
  return NextResponse.json({ ok: true })
}
