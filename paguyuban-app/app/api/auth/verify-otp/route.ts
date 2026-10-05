import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/auth/otp'
import { signJwt } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json()
    if (!phone || !otp) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

    const normalized = normalizePhone(phone)

    // Cek profil terlebih dahulu untuk deteksi admin bypass
    let [profile] = await db.select().from(profiles).where(eq(profiles.phone, normalized)).limit(1)

    const isAdmin = profile?.role === 'admin' ||
      (process.env.ADMIN_PHONE || '').split(',').map(s => s.trim()).filter(Boolean).includes(normalized)

    if (!isAdmin) {
      // Warga/pengurus biasa: validasi OTP normal
      const valid = await verifyOtp(normalized, otp)
      if (!valid) {
        return NextResponse.json({ error: 'Kode OTP salah atau sudah kadaluarsa' }, { status: 401 })
      }
    }
    // Admin: skip validasi OTP, langsung login

    if (!profile) {
      const [created] = await db.insert(profiles).values({ phone: normalized, role: 'tamu' }).returning()
      profile = created
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
    console.error('[verify-otp]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
