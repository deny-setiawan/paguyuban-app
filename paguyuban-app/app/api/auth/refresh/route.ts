import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyJwt, signJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Re-issues the session JWT with the current role/rtGroupId from DB.
// Called when the JWT role is stale (e.g. admin changed the user's role).
export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyJwt(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const [profile] = await db
    .select({ role: profiles.role, rtGroupId: profiles.rtGroupId, phone: profiles.phone })
    .from(profiles)
    .where(eq(profiles.id, payload.sub))
    .limit(1)

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const newToken = await signJwt({
    sub: payload.sub,
    phone: profile.phone,
    role: profile.role,
    rtGroupId: profile.rtGroupId ?? null,
  })

  const res = NextResponse.json({ ok: true, role: profile.role })
  res.cookies.set('session', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
