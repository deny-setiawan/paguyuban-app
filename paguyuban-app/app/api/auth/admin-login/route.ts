import { NextRequest, NextResponse } from 'next/server'
import { signJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'

const ADMIN_ROLES = ['admin']
const ADMIN_PASSWORD = process.env.ADMIN_BYPASS_PASSWORD || '1234'

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()
    if (!phone || !password) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

    const normalized = normalizePhone(phone)

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Sandi salah' }, { status: 401 })
    }

    let [profile] = await db.select().from(profiles).where(eq(profiles.phone, normalized)).limit(1)

    // Jika profil belum ada tapi nomor cocok dengan ADMIN_PHONE env, buat profil baru sebagai admin
    if (!profile) {
      const adminPhones = (process.env.ADMIN_PHONE || '').split(',').map(s => s.trim()).filter(Boolean)
      if (adminPhones.includes(normalized)) {
        const [created] = await db.insert(profiles).values({ phone: normalized, role: 'admin' }).returning()
        profile = created
      }
    }

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const token = await signJwt({
      sub: profile.id,
      phone: profile.phone,
      role: profile.role,
      rtGroupId: profile.rtGroupId ?? null,
    })

    const response = NextResponse.json({
      ok: true,
      role: profile.role,
      isVerified: profile.isVerified,
    })

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[admin-login]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
