import { NextRequest, NextResponse } from 'next/server'
import { generateOtp, saveOtp } from '@/lib/auth/otp'
import { sendWhatsAppOtp } from '@/lib/wa-client'
import { normalizePhone } from '@/lib/utils'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ADMIN_ROLES = ['admin']

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 })

    const normalized = normalizePhone(phone)
    if (normalized.length < 10 || normalized.length > 15) {
      return NextResponse.json({ error: 'Format nomor HP tidak valid' }, { status: 400 })
    }

    // Admin bypass: jika nomor milik pengurus, skip OTP
    const [profile] = await db.select({ role: profiles.role, phone: profiles.phone })
      .from(profiles).where(eq(profiles.phone, normalized)).limit(1)
    console.log('[send-otp] normalized:', normalized, '| profile found:', profile ?? 'NOT FOUND')
    const isAdmin = (profile && ADMIN_ROLES.includes(profile.role)) ||
      (process.env.ADMIN_PHONE || '').split(',').map(s => s.trim()).filter(Boolean).includes(normalized)

    if (isAdmin) {
      console.log('[send-otp] adminBypass granted for role:', profile?.role ?? 'via ADMIN_PHONE env')
      const res = NextResponse.json({ ok: true, phone: normalized, adminBypass: true })
      // Cookie pendek (5 menit) agar OTP page bisa deteksi admin bypass
      res.cookies.set('admin_bp', normalized, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 300,
        path: '/',
      })
      return res
    }

    const otp = generateOtp()
    await saveOtp(normalized, otp)
    const sent = await sendWhatsAppOtp(normalized, otp)

    if (!sent) {
      return NextResponse.json({ error: 'Gagal mengirim OTP, coba lagi' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, phone: normalized })
  } catch (err) {
    console.error('[send-otp]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
