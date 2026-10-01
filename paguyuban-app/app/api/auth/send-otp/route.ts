import { NextRequest, NextResponse } from 'next/server'
import { generateOtp, saveOtp } from '@/lib/auth/otp'
import { sendWhatsAppOtp } from '@/lib/wa-client'
import { normalizePhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: 'Nomor HP wajib diisi' }, { status: 400 })

    const normalized = normalizePhone(phone)
    if (normalized.length < 10 || normalized.length > 15) {
      return NextResponse.json({ error: 'Format nomor HP tidak valid' }, { status: 400 })
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
