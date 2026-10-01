import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { warga, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyJwt(token)
  if (!payload || !['ketua', 'sekretaris', 'bendahara', 'admin'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!payload.rtGroupId) return NextResponse.json({ error: 'No RT' }, { status: 400 })

  const list = await db.select({
    warga,
    phone: profiles.phone,
    isActive: profiles.isActive,
    role: profiles.role,
  }).from(warga)
    .leftJoin(profiles, eq(warga.profileId, profiles.id))
    .where(eq(warga.rtGroupId, payload.rtGroupId))
    .orderBy(warga.noRumah)

  return NextResponse.json({ list })
}
